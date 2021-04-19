
import * as server from "./server.tsx";
import App from "../components/App.tsx";

import * as yargs from "yargs";

const args = yargs.default(Deno.args)
    .usage("usage: $0 server/daemon.tsx --hostname <host> [--domain <name>] [--tls <path>]")
    .hide("help")
    .hide("version")
    .hide("hostname")
    .demandOption(["hostname"])
    .parse();

try
{
    const serverAttributes: server.ServerAttributes =
    {
        secure: !!args.tls,
        domain: args.domain,
        routes:
        {
            "/favicon.ico": "/static/favicon.ico",
            "/robots.txt": "/static/robots.txt"
        },
        hostname: args.hostname,
        port: 8080,

        portTls: 8443,
        cert: args.tls,

        App: App,

        schema: "graphql/schema.gql",
        resolvers: { request: function () { return "response"; } },
    };
    const httpserver = new server.Server(serverAttributes);
    await httpserver.serve();
}
catch (error)
{
    server.Console.error(error);
    Deno.exit(1);
}