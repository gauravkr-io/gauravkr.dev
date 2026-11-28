---
slug: "cache-invalidation-correctness"
title: "Cache invalidation is a correctness problem"
subtitle: "Teams add caching to fix latency and quietly accept a class of bugs they never wrote down."
summary: "Teams add caching to fix latency and quietly accept a class of bugs they never wrote down. Invalidation deserves the same rigour as the query it replaces."
category: "System Design"
tags: ["Caching","Consistency","System Design"]
date: "2026-07-08"
readingTime: "6 min read"
coverImage: "/assets/images/blogs/cache-invalidation-correctness.webp"
author: "Gaurav Kumar"
featured: true
visible: true
draft: false
relatedPosts: ["idempotency-keys-checkout","jvm-heap-dump-walkthrough"]
---

Caching gets proposed as a performance fix and approved as a performance fix. Almost nobody reviews it as what it really is, which is a decision to serve data that might be wrong, in exchange for serving it faster.

That trade is often worth making. It is only ever safe to make deliberately.

## Ask the staleness question first

Before choosing a cache technology or a TTL, the question to answer is this one. How wrong is this value allowed to be, and for how long, before it causes a problem someone notices?

In commerce the answer varies wildly across data that sits on the same page. A product description can be an hour stale and nobody cares. A price being sixty seconds stale is a pricing incident. Inventory being stale is an oversell, which is a refund, an apology and a support cost.

- Product copy and imagery tolerate long TTLs comfortably.
- Pricing and promotions need short TTLs plus explicit invalidation on change.
- Inventory and cart state usually should not be cached at the edge at all.
- Personalised content must never share a cache key with anonymous content.

:::warning The one that bites hardest
A cache key that omits a dimension the response actually varies on will serve one user's data to another. Locale, currency, customer group and authentication state all belong in the key when they affect the output.
:::

## TTL is not an invalidation strategy

A TTL bounds how long a value can be wrong. It does not make the value correct when something changes. If a price update needs to be live within seconds, a five-minute TTL is not a strategy, it is a five-minute incident window.

Explicit invalidation on write is the other half. The write path publishes an event, and whatever holds the cached copy drops it.

```java
@Transactional
public Price updatePrice(String sku, Money amount) {
    Price saved = priceRepository.save(new Price(sku, amount));

    // published after commit, so no consumer can read a value
    // that a rollback would have removed
    events.publishAfterCommit(new PriceChanged(sku));
    return saved;
}
```

The detail in that snippet matters more than the caching itself. Publishing the invalidation inside the transaction means a consumer can refill the cache from a read that has not committed yet, which reintroduces exactly the stale value you were trying to remove. Invalidation events belong after commit.

## The stampede

When a popular key expires under load, every request that misses goes to the origin at once. The cache that was protecting the database becomes the reason the database falls over, and it happens at peak traffic because that is when the key is popular.

Two mitigations cover most cases. Let one request rebuild the value while others serve the slightly stale copy, and add a small random jitter to TTLs so keys written together do not expire together.

## What to write down

Before any cache goes in, I want four things recorded next to it. The tolerated staleness, the full key including every dimension the response varies on, what invalidates it, and what happens when the cache is unavailable.

If the fourth one has no answer, the cache is not an optimisation any more. It has become a dependency, and it needs to be treated like one.
