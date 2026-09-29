# workerd configuration for running the speed test Worker outside Cloudflare
using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [ (name = "main", worker = .speedtest) ],
  sockets = [ (name = "http", address = "0.0.0.0:8080", http = (), service = "main") ],
);

const speedtest :Workerd.Worker = (
  serviceWorkerScript = embed "worker.js",
  compatibilityDate = "2024-09-01",
);
