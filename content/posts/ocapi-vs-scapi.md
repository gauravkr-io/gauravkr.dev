---
slug: "ocapi-vs-scapi"
title: "OCAPI or SCAPI: choosing without regretting it later"
subtitle: "The two Salesforce Commerce APIs overlap enough to look interchangeable and differ enough to make the wrong pick a migration."
summary: "The two Salesforce Commerce APIs overlap enough to look interchangeable and differ enough to make the wrong pick a migration. A practical way to decide."
category: "E-Commerce"
tags: ["SFCC","OCAPI","SCAPI","Architecture"]
date: "2026-07-30"
readingTime: "8 min read"
coverImage: "/assets/images/blogs/ocapi-vs-scapi.svg"
author: "Gaurav Kumar"
featured: true
visible: true
draft: false
relatedPosts: ["idempotency-keys-checkout","service-boundaries-domain-seams"]
---

If you are putting an API layer in front of Salesforce Commerce Cloud, you will be asked to pick between OCAPI and SCAPI early, usually before anyone has written a requirement precise enough to decide it. The decision then gets made on whichever one the team used last.

That is an expensive way to choose. These are not two versions of the same API. They have different authentication models, different extension stories and different operational characteristics, and moving between them later touches every consumer you have.

## The short version

- **OCAPI** is the older surface. Broad coverage, well understood, and configured per site through the API settings in Business Manager.
- **SCAPI** is the newer surface. Cleaner resource design, better suited to headless and mobile consumers, and built around a different authorisation model.
- Coverage is not identical. There are still operations available on one that are awkward or absent on the other.

:::note Check coverage first, not last
Before the architecture discussion, list the actual operations your consumers need and confirm each one exists on the API you are leaning towards. Coverage gaps decide this more often than design preference does.
:::

## Authentication is the real fork in the road

This is where most teams underestimate the difference. The shopper authorisation flows differ, the token lifetimes differ, and the way you attach a guest session to an authenticated one differs. Any client you build encodes those assumptions fairly deeply.

If you build a mobile app against one model and later migrate, you are not changing a base URL. You are rewriting session handling in the app, re-testing every authenticated path, and coordinating a release with a team that has its own cadence.

## Where extension logic lives

Both let you extend behaviour through hooks, but the ergonomics are not the same, and this matters more than it looks. Commerce logic that does not fit the platform's default shape is not unusual. It is the normal case.

```javascript
// a hook that enriches a basket response before it leaves the platform
exports.afterGET = function (basket) {
  const deliveryWindows = DeliveryService.windowsFor(basket);

  return new Status(Status.OK, 'OK', {
    c_deliveryWindows: deliveryWindows.map(function (window) {
      return { id: window.ID, from: window.from, to: window.to };
    })
  });
};
```

Custom attributes prefixed with `c_` are the standard escape hatch on both. The thing to watch is discipline rather than mechanism. A response object carrying fifteen custom attributes is a sign the integration boundary was drawn in the wrong place, and no amount of hook code fixes that.

## A decision procedure that works

When I have had to make this call for a client, four questions have settled it every time.

1. Who consumes this API, and how many release cycles are they on? A mobile app on a two-week store review cycle cannot absorb a breaking change the way a web front end can.
2. Does every operation we need exist today, without a workaround? A gap you plan to route around becomes permanent.
3. What is the roadmap for this storefront over three years? Headless intent points one way, an SFRA storefront with light API needs points the other.
4. Who operates this after launch? The team that will be on call should recognise the authentication model in an incident.

## The middleware question

On a recent engagement the mobile app team and the commerce team were on completely different cadences, which meant any direct coupling made both of them slower. We put a middleware layer in between, built on OCAPI and SCAPI underneath, and gave the app a versioned contract of our own.

That is worth considering even when the platform API would technically do. Your own contract can be versioned on your schedule, can hide a platform migration entirely, and can present the domain the way the app needs rather than the way the platform models it.

:::warning The cost of the middleware layer
It is another service to run, monitor and keep in sync. Do not add it for a single web storefront. Add it when you have two or more consumers on different release cycles.
:::

There is no universally correct answer here. There is a correct answer for a given set of consumers, a given roadmap and a given team, and the work is in writing those three things down before the discussion rather than after it.
