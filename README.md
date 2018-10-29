# api-server

This is a sample server to demonstrate securing API resources using the WebAppStrategy to access [IBM App ID](https://www.ibm.com/cloud/app-id).

There is an accompanying [vuejs client](https://github.com/ibmets/appid-vue-client) sample to demonstrate how to access secured resources using VueJS.  The client also demonstrates how to secure VueJS routes.

This server is based heavily upon the one used in the [Securing Angular+Node.js Applications using App ID](https://www.ibm.com/blogs/bluemix/2018/04/securing-angularnode-js-applications-using-app-id/) blog post.

## Assumptions for running the sample

1. the API serving the App ID instance is running on port 3000 on localhost
2. the vuejs client is running on port 8080 on localhost
3. in production you will want to use a proper session store.  The [redis](https://www.npmjs.com/package/connect-redis) or [cloudant](https://www.npmjs.com/package/connect-cloudant-store) ones will work quite nicely on the IBM Cloud or you can refer to the [list of session stores](https://www.npmjs.com/package/express-session)


## App ID Configuration

1. Create an instance of the appid service

2. Get the credentials for the instance
  - Click on the deployed instance from the dashboard
  - Go to Service Credentials in the left menu
  - Click the "New Credential+" button
  - Leave the defaults (name, reader role, service ID, inline configuration) and click the "Add" button
  - Click the twisty to expand the credentials and plumb those into the `config.js` file


3. Add a web redirect URL to App ID
  - Go to Manage in the left menu
  - Go to the Authentication Settings tab
  - Add `http://localhost:3000/ibm/bluemix/appid/callback` as a web direct URL


4. Add a user
  - Go to Users in the left menu
  - Click the "Add User" button
  - Complete the form with the required details and click the "Save" button

  ## Project setup
  ```
  npm install
  ```

  ### Start the server
  ```
  npm start
  ```
