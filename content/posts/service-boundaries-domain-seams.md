---
slug: "service-boundaries-domain-seams"
title: "Cut services along domain seams, not team charts"
subtitle: "Most painful microservice migrations split the system where the org chart was, not where the data ownership was."
summary: "Most painful microservice migrations split the system where the org chart was, not where the data ownership was. The difference shows up in every transaction afterwards."
category: "Backend"
tags: ["Microservices","Domain Modelling","Architecture"]
date: "2026-04-19"
readingTime: "6 min read"
coverImage: "/assets/images/blogs/service-boundaries-domain-seams.svg"
author: "Gaurav Kumar"
featured: false
visible: true
draft: false
relatedPosts: ["idempotency-keys-checkout","cache-invalidation-correctness"]
---

A microservice split that goes badly rarely goes badly at the code level. The services get built, they deploy, the demo works. It goes badly six months later, when a routine feature needs a transaction across three of them and there is no clean way to do it.

Almost always, the boundary was drawn in the wrong place, and it was drawn there because it matched how the teams were organised rather than how the data was owned.

## The test that matters

A good boundary has one property above all others. Each service owns its data outright, and no other service writes to it. If two services need to write the same table to complete a normal operation, that is not two services. That is one service with a network call inside it.

Before splitting anything, I list the operations the business actually performs and mark which data each one writes. Operations that write across a proposed boundary are the whole risk, and they need to be visible on a page before the split is agreed.

:::note A useful sanity check
If your proposed split requires a distributed transaction to complete a common operation, the boundary is in the wrong place. Move it rather than reaching for a coordinator.
:::

## Commerce is full of these traps

Consider splitting orders and inventory into separate services, which sounds obviously correct. Placing an order reserves stock. That is one business operation writing to two services, and now you need a reservation protocol, a compensating action for failures, and an answer for what a customer sees while the two disagree.

Sometimes that complexity is justified, because inventory genuinely has a different scaling profile and a different set of consumers. Often it is not, and the honest answer is that orders and reservations belong together, with inventory projections published outward for everyone else to read.

- Write ownership is exclusive. Exactly one service writes each piece of data.
- Reads can be shared freely through projections, events or an API.
- Cross-service consistency should be eventual by design, and the staleness window should be a stated number.
- If a boundary needs a distributed transaction, treat that as evidence against the boundary.

## Start with a modular monolith

The strongest argument for extracting a service is that you already know exactly where its edges are. That knowledge is much cheaper to acquire inside one deployable, where moving a boundary is a refactor rather than a migration.

```java
// enforce the seam in the monolith first: modules talk through published
// interfaces only, never by reaching into each other's repositories
package com.shop.ordering;

public interface InventoryGateway {
    ReservationResult reserve(SkuQuantity requested, OrderId orderId);
    void release(ReservationId reservationId);
}
```

Once every cross-module call goes through an interface like that, extraction becomes a change of transport rather than a redesign. If you cannot enforce the seam inside a single codebase, a network boundary will not enforce it either. It will just make the violations harder to see.

## Reasons that actually justify a split

There are good reasons to extract a service. A genuinely different scaling profile, a different availability requirement, a different data store, or an independent release cadence that the business is paying for. All of those are concrete.

Wanting the codebase to feel tidier is not one of them, and neither is team autonomy on its own. Team autonomy is a real goal, but it is achievable with module ownership inside one deployable, at a fraction of the operational cost.
