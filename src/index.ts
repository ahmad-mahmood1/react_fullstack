import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import "reflect-metadata";
import { MyContext } from "src/types";
import { buildSchema } from "type-graphql";
import { DataSource } from "typeorm";
import { __prod__ } from "./constants";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResovler } from "./resolvers/user";

const main = async () => {
  const dataSource = new DataSource({
    entities: ["dist/entities/*js"], // path to our JS entities (dist), relative to `baseDir`
    database: "tracker",
    username: "postgres",
    password: "postgres",
    type: "postgres",
    logging: !__prod__,
    synchronize: true,
  });

  await dataSource.initialize();

  const app = express();
  const corsConfig = {
    credentials: true,
    origin: "http://localhost:3000",
  };
  app.use(cors(corsConfig));

  let RedisStore = require("connect-redis")(session);
  let redis = new Redis();

  app.use(
    session({
      name: "qid",
      store: new RedisStore({ client: redis, disableTouch: true }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: "lax", //need to read on this
        secure: __prod__,
      },
      saveUninitialized: false,
      secret: "keyboard cat",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResovler],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ req, res, redis }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    "Listening on Port:4000";
  });
};

main().catch((err) => {
  console.error(err);
});
