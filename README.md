## Speed Test

Worker for measuring download / upload connection speed from the client side, using the [Performance Timing API](https://w3c.github.io/perf-timing-primer/).

### Installation

[`index.js`](https://github.com/cloudflare/worker-speedtest-template/blob/master/router.js) is the content of the Workers script.

_Note:_ when running this as your own worker, your latency measurements may differ a small amount from the [official version](https://speed.cloudflare.com). This is due to the fact that we rely on an internal mechanism to determine the amount of server processing time, which is then subtracted from the measurement.

#### Wrangler

You can use [wrangler](https://github.com/cloudflare/wrangler) to generate a new Cloudflare Workers project based on this template by running the following command from your terminal:

```
wrangler generate myApp https://github.com/cloudflare/worker-speedtest-template
```

Before publishing your code you need to edit `wrangler.toml` file and add your Cloudflare `account_id` - more information about publishing your code can be found [in the documentation](https://workers.cloudflare.com/docs/quickstart/configuring-and-publishing/).

Once you are ready, you can publish your code by running the following command:

```
wrangler publish
```

#### Docker (self-hosted)

To measure speed to your own servers instead of Cloudflare's network, run the worker in a container using [workerd](https://github.com/cloudflare/workerd), the open-source Workers runtime. No Cloudflare account is needed.

```
docker build -t speedtest-worker .
docker run -d --name speedtest -p 8080:8080 --restart unless-stopped speedtest-worker
```

Then open `http://SERVER:8080` in a browser and press **Start**. The page shows download and upload speed, latency, jitter, a network quality score and charts of every measurement. It uses Cloudflare's open-source measurement engine, [`@cloudflare/speedtest`](https://github.com/cloudflare/speedtest), with result reporting turned off, so no data leaves your network. Packet loss is not measured, since it needs a TURN server.

You can also test from the command line:

```
# Download
curl -s -o /dev/null -w 'down: %{speed_download} B/s\n' "http://SERVER:8080/down?bytes=50000000"

# Upload
head -c 50000000 /dev/zero | curl -s -o /dev/null -w 'up: %{speed_upload} B/s\n' --data-binary @- http://SERVER:8080/up

# Latency
curl -s -o /dev/null -w 'ttfb: %{time_starttransfer}s\n' "http://SERVER:8080/down?bytes=0"
```

To build the worker without Docker, run `npm install --no-save esbuild @cloudflare/speedtest && node build.mjs`, which writes `dist/worker.js` with the page included.

The `cf-meta-colo` header is not set when self-hosted, since there is no Cloudflare data center involved.

#### Serverless

To deploy using serverless add a [`serverless.yml`](https://serverless.com/framework/docs/providers/cloudflare/) file.

### API Reference

This worker exposes two endpoints designed to support the measuring of bandwidth and latency from the client side.

#### Download

**GET** `/down` Request binary content of a certain size

| Param | Description                            | Required | Default |
| ----- | -------------------------------------- | :------: | :-----: |
| bytes | The size of the response body in bytes |    no    |    0    |

Example: `/down?bytes=10000`

#### Upload

**POST** `/up` Receive content posted to the server

The content is discarded by the endpoint. A response is sent once all the content has been received from the client.

No query string parameters.
