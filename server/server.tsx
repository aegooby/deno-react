
import * as http from "http";
import * as httpFile from "http-file";
import * as path from "path";
import * as fs from "fs";
import * as colors from "colors";

import * as yargs from "yargs";

export class Console
{
    static log(message: string): void
    {
        console.log(colors.bold(colors.cyan("  [*]  ")) + message);
    }
    static success(message: string): void
    {
        console.log(colors.bold(colors.green("  [$]  ")) + message);
    }
    static warn(message: string): void
    {
        console.warn(colors.bold(colors.yellow("  [?]  ")) + message);
    }
    static error(message: string): void
    {
        console.error(colors.bold(colors.red("  [!]  ")) + message);
    }
}

export type Protocol = "unknown" | "http" | "https";

export interface ServerAttributes
{
    protocol: Protocol;
    hostname: string;
    port: number;

    routes?: Map<string, string>;
}

export class Server
{
    #httpServer: http.Server;
    #protocol: Protocol;
    #routes: Map<string, string> = new Map<string, string>();

    constructor({ protocol, hostname, port, routes }: ServerAttributes)
    {
        this.#protocol = protocol;
        const serveOptions =
        {
            hostname: hostname,
            port: port,
        };
        const serveTLSOptions =
        {
            hostname: hostname,
            port: port,
            certFile: ".https/localhost/cert.pem",
            keyFile: ".https/localhost/key.pem",
        };
        switch (this.#protocol)
        {
            case "http":
                this.#httpServer = http.serve(serveOptions);
                break;
            case "https":
                this.#httpServer = http.serveTLS(serveTLSOptions);
                break;
            default:
                throw new Error("unknown server protocol (please choose HTTP or HTTPS)");
        }
        if (routes)
            this.#routes = routes;
        else
        {
            this.#routes.set("/", "/static/index.html");
            this.#routes.set("/favicon.ico", "/static/favicon.ico");
            this.#routes.set("/404.html", "/static/404.html");
        }
    }
    get port(): number
    {
        const address = this.#httpServer.listener.addr as Deno.NetAddr;
        return address.port;
    }
    get hostname(): string
    {
        const address = this.#httpServer.listener.addr as Deno.NetAddr;
        if ((["::1", "127.0.0.1"]).includes(address.hostname))
            return "localhost";
        return address.hostname;
    }
    get url(): string
    {
        return this.#protocol + "://" + this.hostname + ":" + this.port;
    }
    async static(request: http.ServerRequest): Promise<void>
    {
        request.respond(await httpFile.serveFile(request, request.url));
    }
    async route(request: http.ServerRequest): Promise<void>
    {
        const originalURL = request.url;
        Console.success("Received " + request.method + " request: " + originalURL);
        if (this.#routes.has(request.url))
            request.url = this.#routes.get(request.url) as string;
        request.url = path.join(".", request.url);
        if (!await fs.exists(request.url))
        {
            Console.error("Route " + originalURL + " not found");
            request.url = "static/404.html";
        }
        await this.static(request);
    }
    async serve(): Promise<void>
    {
        const compilerOptions: Deno.CompilerOptions =
        {
            allowJs: true,
            experimentalDecorators: true,
            noImplicitAny: true,
            jsx: "react",
            lib: [
                "deno.ns",
                "deno.unstable",
                "dom"
            ],
            strict: true
        };
        const emitOptions: Deno.EmitOptions =
        {
            bundle: "esm",
            check: true,
            compilerOptions: compilerOptions,
            importMapPath: "import-map.json",
        };
        Console.log("Bundling client scripts...");
        const emit = await Deno.emit("client/bundle.tsx", emitOptions);
        const array = new TextEncoder().encode(emit.files["deno:///bundle.js"]);
        Deno.writeFile(".httpsaurus/bundle.js", array);
        Console.success("Bundled client scripts!");
        Console.log("Server is running on " + colors.underline(colors.magenta(this.url)));
        for await (const request of this.#httpServer)
            await this.route(request);
    }
    static async main(): Promise<void>
    {
        const args = yargs.default(Deno.args)
            .usage("usage: $0 server/server.tsx --hostname <host> [--port <port>] [--help]")
            .hide("help")
            .hide("version")
            .hide("hostname")
            .demandOption(["protocol", "hostname", "port"])
            .parse();

        const protocol: Protocol = args.protocol;
        const hostname: string = args.hostname;
        const port: number = args.port;

        try
        {
            const serverAttributes =
            {
                protocol: protocol,
                hostname: hostname,
                port: port,
            };
            const server = new Server(serverAttributes);
            await server.serve();
        }
        catch (error)
        {
            Console.error(error.toString());
            Deno.exit(1);
        }
    }
}

if (import.meta.main)
    await Server.main();
