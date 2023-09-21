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

The content is discarded by the endpoint. A response is sent once all the content has been received by the client.

No query string parameters.
