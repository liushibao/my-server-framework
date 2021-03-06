# my-server-framework
a light weight nodejs express framework, including dependency injection using inversifyjs, a thin wrapper over pg lib as a light ORM. This framework (try to) adopts CQRS design principle, uses Kafka as the command logger, so dose provide a commander class and an executor class respectively. Api servers use the commander class to log command to Kafka, and return immediately, then, in a separate time, executor servers use the executor class to do some thing with the commands, either update database or cache, or anything else, like call other apis.

# About
I developed this framework and an authentication server based on this for a startup. It's the first project I used typescript for backend, so many parts of the design don't look good. For example, the service layer unit tests tested the repository logic, making them more look like integration tests. I am working on an Ionic app now, so will not update this framework for a while, but its on my long term plan.

# Updates on 2020-10-6
A lot of problems with this framework were found in my first project. I have made many bug fix to it, but it still not ideal and not recommended to use. A complete rewrite is desired to make it more workable with. Here are some points for the forth coming rewrite:
1) The dependency injection will be removed! No need for DI in nodejs as the language itself is dynamic. You don't have to define interfaces and inject dependencies to make it testable with mocks as in other static languages. So the DI does not help but only complicates things for me.
2) Originally, I was thinking to mimic other MVC framworks that using reflection to map url path to class (module), method, then attribute (decoration). In my first endeavour of nodejs project, however, I find it's just very elegant and simple to follow express framwork middleware style. So the router class and middlewares will be simplified.
3) To make the framwork more adaptive and usefull in today's microservice context, I will divide it into several packages, namingly, common, server-common, pg-orm, redis, kafka, db-executor, cache-executor, express-plugins, wechat, wepay, alipay. Each of these should be reference according to actual needs, not an all-in bloated package. The additional benefit from this division is that I can develop/evolve each of them independantly, though some of them depend on the commons.
4) Simplify the executors, current version is somewhat in the callback hell.
5) Will adopt the go style error handling for sync and async methods. Kind of no throw concept from c++. A usefull addition to this would be adding a next callback just like the express framework dose.
6) Will adopt dart style method parameters, classify parameters as positional (those required) and optional (simply add an optional object parameter at the end, later can add whatever properties to the object without changing the method signature).
7) Remove the complicated test helper class, use jest directly instead. These test helpers helped little, complicated things more.

# Updates on 2020-10-7
8) Will make all class members public. Those originally supposed to be private or protected will rename to prefix an underscore. There is not a private modifier in javascript, not in es6, not even in es10, so it's pointless to mimic this, just prefix an underscore to remind the developers. This will make it easier to test and mock private members, save you from using <any> cast. Removing all class modifier key words also makes the code looks more concise. This is also similar to dart language.
  
Above notes are very opinionated. There are certainly better ways to use the nodejs platform and the Typescript language. I am still learning about it.
