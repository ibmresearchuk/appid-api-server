const express = require("express");
const session = require("express-session");
const log4js = require('log4js');
const passport = require("passport");
const nconf = require("nconf");
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
const helmet = require("helmet");
const express_enforces_ssl = require("express-enforces-ssl");
const cfEnv = require("cfenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const CALLBACK_URL = "/ibm/bluemix/appid/callback";
const UI_BASE_URL = "http://localhost:8080";

const app = express();
const port = process.env.PORT || 3000;
const logger = log4js.getLogger("appid-nodejs");
const isLocal = cfEnv.getAppEnv().isLocal;
const config = getLocalConfig();

app.use(cors({credentials: true, origin: UI_BASE_URL}));
app.use(helmet());
app.use(cookieParser());
app.use(helmet.noCache());
app.enable("trust proxy");
if (!isLocal) app.use(express_enforces_ssl());

// Setup express application to use express-session middleware
// Must be configured with proper session storage for production
// environments. See https://github.com/expressjs/session for
// additional documentation
app.use(session({
    secret: "123456",
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
        httpOnly: true,
        secure: !isLocal,
        maxAge: 600000000
    }
  }));

// Configure express application to use passportjs
app.use(passport.initialize());
app.use(passport.session());

passport.use(new WebAppStrategy(config));

// Configure passportjs with user serialization/deserialization. This is required
// for authenticated session persistence accross HTTP requests. See passportjs docs
// for additional information http://passportjs.org/docs
passport.serializeUser(function(user, cb) {
    cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

// custom middleware to redirect back to the page requested in the ?redirect query parameter to the request
function addRedirect(req, res, next) {
  let redirectPage = "/" // default to returning to the root page
  if (req.query && req.query.redirect) {
    redirectPage = req.query.redirect
  }

  // this will set the redirect page so long as the WebAppStrategy does not specify a successRedirect option
  req.originalUrl = UI_BASE_URL + redirectPage

  next()
}

// Explicit login endpoint. Will always redirect browser to login widget due to {forceLogin: true}. If forceLogin is set to false the redirect to login widget will not occur if user is already authenticated
app.get("/auth/login", addRedirect, passport.authenticate(WebAppStrategy.STRATEGY_NAME, {forceLogin: true}));

// Callback to finish the authorization process. Will retrieve access and identity tokens/
// from AppID service and redirect to either (in below order)
// 1. the original URL of the request that triggered authentication, as persisted in HTTP session under WebAppStrategy.ORIGINAL_URL key.
// 2. successRedirect as specified in passport.authenticate(name, {successRedirect: "...."}) invocation
// 3. application root ("/")
app.get(CALLBACK_URL, passport.authenticate(WebAppStrategy.STRATEGY_NAME, {allowAnonymousLogin: true}));

// Logout endpoint. Clears authentication information from session
app.get("/auth/logout", function(req, res, next) {
	WebAppStrategy.logout(req);
	res.redirect(UI_BASE_URL);
});

app.get('/auth/logged', (req,res) => {
    let loggedInAs = {};
    if(req.session[WebAppStrategy.AUTH_CONTEXT]) {
        loggedInAs['name'] = req.user.name;
        loggedInAs['email'] = req.user.email;
    }

    res.send({
        logged: req.session[WebAppStrategy.AUTH_CONTEXT] ? true : false,
        loggedInAs: loggedInAs
    })
});

function isLoggedIn(req,res,next) {
	if(req.session[WebAppStrategy.AUTH_CONTEXT]) {
        next();
    } else {
        res.redirect(UI_BASE_URL);
    }
}

// short hand way to protect a series of different API end points
app.use('/protected/*', isLoggedIn);

//'/protected/get-some-info'  is the protected resource in the backend.
//We show the protected data only if the user is authenticated.
app.get('/protected/get-some-info', (req,res) => {
    res.send({
        "hello" : "world"
    })
});


function getLocalConfig() {
	if (!isLocal) {
		return {};
	}
	let config = {};
	const localConfig = nconf.env().file(`${__dirname}/config.json`).get();
	const requiredParams = ['clientId', 'secret', 'tenantId', 'oAuthServerUrl', 'profilesUrl'];
	requiredParams.forEach(function (requiredParam) {
		if (!localConfig[requiredParam]) {
			console.error('When running locally, make sure to create a file *config.json* in the root directory. See config.template.json for an example of a configuration file.');
			console.error(`Required parameter is missing: ${requiredParam}`);
			process.exit(1);
		}
		config[requiredParam] = localConfig[requiredParam];
	});
	config['redirectUri'] = `http://localhost:${port}${CALLBACK_URL}`;
	return config;
}

// Start the server!
app.listen(port, function() {
	logger.info("Listening on http://localhost:" + port);
});
