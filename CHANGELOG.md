# flow-cloudflare-worker

## 0.4.1

### Patch Changes

- add `FP_LOG_LEVEL` environment variable to limit console logging in instrumentation scripts ([00f7ff0](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/00f7ff004a884daa4b1733358521ba687cbf1438))

## 0.4.0

### Minor Changes

- Improve validation for the `FP_FAILURE_FALLBACK_ACTION` ([d06818d](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/d06818d388d097057643dc01f7943b74ad8eaf95))
- Add tampering protection ([1c70f4a](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/1c70f4a9d53c4df71672310bee4411ea321a459a))
- Add validation for protected HTTP method ([8511ff9](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/8511ff9cb3a4cf997086af733aa1d3d69238396b))
- Add validation for the response received from the identification service ([d06818d](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/d06818d388d097057643dc01f7943b74ad8eaf95))
- Don't use cache for signals collected from agent ([78da4ac](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/78da4ac633d4aaf40fb4fd8ccb815fb58122b7af))

## 0.3.1

### Patch Changes

- Fix broken route matching for the same route with different HTTP methods ([4b41b82](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/4b41b82dada8c496cefa817b2b433195a1cfd3ac))

## 0.3.0

### Minor Changes

- Add license banner to built code ([ce7ef68](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/ce7ef68839b3ba36fe928af61c4481d00ff96b54))
- Rename `FP_CDN_URL` to `FP_CDN_HOST` ([ce7ef68](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/ce7ef68839b3ba36fe928af61c4481d00ff96b54))
- Rename release artifact to `flow_cloudflare_worker.js` ([ce7ef68](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/ce7ef68839b3ba36fe928af61c4481d00ff96b54))

## 0.2.0

### Minor Changes

- Introduce monitor mode for non-invasive request handling ([65cf6f3](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/65cf6f39e43c569a6708b1b14462ebe82590a7a0))
- Support new cookie response format in ODI ([e72b9f4](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/e72b9f49c4f09366d754964353900f26b2cc410b))
- Add integration info to CDN request and agent start call ([ac641f3](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/ac641f31e38842a5f254e8e50dca06ffcf17b99b))

## 0.1.0

### Minor Changes

- Initial version of the Flow Cloudflare Worker with basic functionality ([3ebe83d](https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk/commit/3ebe83db585c85691d30ddd01496a067353e1325))
