/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */

const path = require("path");

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false
});

var bodyParser = require("body-parser");

const router = require("express").Router();
const axios = require("axios");

router.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
router.use(bodyParser.json());

router.get("/", (req, res) => {
  console.log(req.headers);
  res.status(201);
  res.json({ verification: req.headers["x-okta-verification-challenge"] });
});

// ************************* APPLICATION BEGINS **********************************

//Create Custom Authentication Service to your Okta

router.post("/oktaCustomConnection", async (req, res) => {
  var authZeroToken = req.body.auth_0_jwt;
  var authZeroUrl = req.body.auth_0_url;
  var okta_token = req.body.okta_token;
  var okta_url = req.body.okta_url;
  console.log(req.body)
   //var result = await getOktaResource(okta_token, okta_url, "connections");
  console.log("here!!!")
    await createAuthZeroResource(
      okta_url,
      authZeroUrl,
      authZeroToken,
      "connections"
    );
  res.json({ hello: "hello"});
});

// Apps Service
router.post("/apps", async (req, res) => {
  var authZeroToken = req.body.auth_0_jwt;
  var authZeroUrl = req.body.auth_0_url;
  var okta_token = req.body.okta_token;
  var okta_url = req.body.okta_url;
  var result = await getOktaResource(okta_token, okta_url, "apps");
  var apps = result.data;
  for (let i = 0; i < apps.length; i++) {
    await createAuthZeroResource(
      apps[i],
      authZeroUrl,
      authZeroToken,
      "clients"
    );
  }

  console.log("************************APPS************************");
  res.json({ hello: result.data });
});

// Groups Service
router.post("/groups", async (req, res) => {
  var authZeroToken = req.body.auth_0_jwt;
  var authZeroUrl = req.body.auth_0_url;
  var okta_token = req.body.okta_token;
  var okta_url = req.body.okta_url;
  var result = await getOktaResource(okta_token, okta_url, "groups");
  var groups = result.data;
  console.log(groups);
  for (let i = 0; i < groups.length; i++) {
    await createAuthZeroResource(
      groups[i],
      authZeroUrl,
      authZeroToken,
      "roles"
    );
  }

  console.log("************************GROUPS************************");
  res.json({ hello: groups });
});

// Users Service
router.post("/users", async (req, res) => {
  var authZeroToken = req.body.auth_0_jwt;
  var authZeroUrl = req.body.auth_0_url;
  var okta_token = req.body.okta_token;
  var okta_url = req.body.okta_url;
  var result = await getOktaResource(okta_token, okta_url, "users");
  var userData = result.data;
  console.log(userData);
  for (let i = 0; i < userData.length; i++) {
    await createAuthZeroResource(
      userData[i],
      authZeroUrl,
      authZeroToken,
      "users"
    );
  }

  console.log("************************USERS************************");
  res.json({ hello: userData });
});

// getOktaResource fetches a specific resource from Okta
var getOktaResource = async function(okta_token, okta_url, resource) {
  var config = {
    method: "get",
    url: `${okta_url}/api/v1/${resource}?limit=2`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `SSWS ${okta_token}` // Bearer JWT
    }
  };

  var result = await axios(config);
  console.log("gets here");
  return result;
};

// authZeroAppTemplate translates the Okta response into an Auth0 request for APPS
var authZeroAppTemplate = function(oktaRes) {
  var appBody = {
    name: "",
    client_metadata: {}
  };

  console.log(" the Okta res", oktaRes);
  if (oktaRes) {
    appBody["name"] = oktaRes.label;
    appBody["callbacks"] = oktaRes.settings.oauthClient.redirect_uris;
    if (oktaRes.settings.oauthClient.application_type == "browser") {
      appBody["app_type"] = "spa";
    }
  }

  return appBody;
};

// authZeroAppTemplate translates the Okta response into an Auth0 request for ROLES
var authZeroRolesTemplate = function(oktaRes) {
  var rolesBody = {
    name: "",
    description: ""
  };

  console.log(" the Okta res", oktaRes);
  if (oktaRes) {
    rolesBody["name"] = oktaRes.profile.name;
    rolesBody["description"] = oktaRes.profile.description;
  }

  return rolesBody;
};

// authZeroUsersTemplate translates the Okta response into an Auth0 request for USERS
var authZeroUsersTemplate = function(oktaRes) {
  var usersBody = {
    email: "",
    password: "aiowfuhi123wlahkla@#@#@jsdkjg",
    connection: "Username-Password-Authentication"
  };

  console.log(" the Okta res", oktaRes);
  if (oktaRes) {
    usersBody["email"] = oktaRes.profile.email;
  }

  return usersBody;
};

var authZeroPwConnectionTemplate = async function(oktaUrl) {
  return {
    name: "parallel",
    strategy: "auth0",
    options: {
      enabledDatabaseCustomization: true,
      customScripts: {
        login: `async function login(email, password, callback) {\n  const request = require('request');\n\tconsole.log(\"YEAH\")\n  request.post({\n  'url': '${oktaUrl}/api/v1/authn',\n  'headers': {\n    'Accept': 'application/json',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({\n    \"username\": email,\n    \"password\": password,\n    \"options\": {\n      \"multiOptionalFactorEnroll\": true,\n      \"warnBeforePasswordExpired\": true\n    }\n  })\n}, function(err, response, body) {\n    if (err) return callback(err);\n    if (response.statusCode === 401) return callback();\n    const user = JSON.parse(body);\n\n    callback(null, {\n      user_id: user._embedded.user.id.toString(),\n      nickname: user.nickname,\n      email: user.email\n    });\n  });\n}\n`
      }
    }
  };
};

// getAuthZeroResourceType takes a specified Okta resource and translates it into the appropriate Auth0 request template
var getAuthZeroResourceType = async function(type, oktaResource) {
  console.log("in the get resouce type call", type)
  //console.log(authZeroAppTemplate());
  var types = {
    // clients: await authZeroAppTemplate(oktaResource),
    // roles: await authZeroRolesTemplate(oktaResource),
    // users: await authZeroUsersTemplate(oktaResource),
    connections: await authZeroPwConnectionTemplate(oktaResource)
  };
  
  return types[type];
};

// createAuthZeroResource sens a POST request to Auth0 to create resoures in the target tenant
var createAuthZeroResource = async function(
  oktaResource,
  auth_0_url,
  auth_0_jwt,
  resourceType
) {
  var resourceBody = await getAuthZeroResourceType(resourceType, oktaResource);

  // console.log("this is the resource body", resourceBody);
  // console.log("this is the oktaResource", oktaResource);
  console.log("this is the auth0 URL", `${auth_0_url}/api/v2/${resourceType}`);
  // console.log("this is the auth0 jwt", auth_0_jwt);
  // console.log("this is the resourceType", resourceType);
  var config = {
    method: "post",
    url: `${auth_0_url}/api/v2/${resourceType}`,
    headers: {
      Authorization: `Bearer ${auth_0_jwt}`,
      "Content-Type": "application/json"
    },
    data: resourceBody
  };
  try {
    await axios(config);
    return "success";
  } catch (e) {
    console.log("************************ERROR************************");
    //console.log(e);
    console.log("************************ERROR************************");
    return e;
  }
};

router.get("/hello", (req, res) => {
  res.status(201);
  res.json({ hello: "world" });
});

router.get("/foo", async (req, res) => {
  var appBody = await getAuthZeroResourceType("apps");
  res.json({ foo: appBody });
});

// ************************* APPLICATION ENDS **********************************

// Setup our static files
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/" // optional: default '/'
});

fastify.register(require("fastify-cors"), {
  origin: "*"
});

// fastify-formbody lets us parse incoming forms
fastify.register(require("fastify-formbody"));

// point-of-view is a templating manager for fastify
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars")
  }
});

// Load and parse SEO data
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.register(require("fastify-express")).after(() => {
  fastify.use(router);
});

//Run the server and report out to the logs
fastify.listen(process.env.PORT, function(err, address) {
  if (err) {
    console.log("hi error");
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});

//webhook would require us to persist credentials

// i am a dev and i created an okta trial, and auth0 trial.  I go to the cool app to set it up, input my credentials
// i am another dev

// router.post("/", (req, res) => {
//   //fetch the okta and auth 0 credentials
//   const appTypes = ["application.lifecycle.update"];
//   const groupTypes = [];
//   const idpTypes = [];
//   const userTypes = [];
//   console.log(req.body.data.events);
//   var target = req.body.data.events[0]["target"][0];
//   var item = target;
//   console.log("event type", req.body.data.events[0].eventType);
//   var event = req.body.data.events[0].eventType;
//   console.log("this is the item", item);
//   if (appTypes.includes(event)) {
//     console.log("in the app type");
//   } else if (groupTypes.includes(event)) {
//   } else if (idpTypes.includes(event)) {
//   } else if (userTypes.includes(event)) {
//   }
//   res.status(201);
//   res.json({ yo: "yeah" });
// });
