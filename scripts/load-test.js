import http from "k6/http";
import { check, sleep } from "k6";

const base = __ENV.BASE_URL || "https://nova-global-platform.vercel.app";
export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 25 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1500"],
  },
};

export default function () {
  const home = http.get(base + "/");
  check(home, { "home responds 200": (r) => r.status === 200 });
  const health = http.get(base + "/api/health");
  check(health, { "health responds 200": (r) => r.status === 200 });
  sleep(1);
}
