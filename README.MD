Description
    This is a RESTFUL API build with NodeJS that will provide an uptime monitoring application for webpages.

API Specifications
    1. API listens on a PORT and accepts HTTP requests for POST, GET, PUT, DELETE and HEAD
    2. Allow a client to connect, then create a new user, then edit and delete that user
    3. Allow a user to sign-in, which generates a token that can be used for subsequent authenticated requests
    4. Allow a user to sign-out, which invalidates their token
    5. Allow signed-in user to use the token to create a new "check" - a task to find whether a given URL is up or down. User can define what is meant by up/down.
    6. Allow a signed-in user to edit or delete any of the checks created by them
    7. Checks are performed in background at defined interval and sends alerts to users when state of an URL changes from "UP" to "DOWN" and vice-versa.