# my-server-framework
a light weight nodejs express framework, including dependency injection using inversifyjs, a thin wrapper over pg lib as a light ORM. This framework (try to) adopts CQRS design principle, uses Kafka as the command logger, so dose provide a commander class and an executor class respectively. Api servers use the commander class to log command to Kafka, and return immediately, then, in a separate time, executor servers use the executor class to do some thing with the commands, either update database or cache, or anything else, like call other apis.

# About
I developed this framework and an authentication server based on this for a startup. It's the first project I used typescript for backend, so many parts of the design don't look good. For example, the service layer unit tests tested the repository logic, making them more look like integration tests. I am working on an Ionic app now, so will not update this framework for a while, but its on my long term plan.
