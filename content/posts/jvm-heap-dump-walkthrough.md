---
slug: "jvm-heap-dump-walkthrough"
title: "Reading a JVM heap dump without panicking"
subtitle: "A service is using four gigabytes and nobody knows why. A repeatable process for getting from that sentence to the offending line."
summary: "A service is using four gigabytes and nobody knows why. A repeatable process for getting from that sentence to the offending line of code."
category: "Performance"
tags: ["Java","JVM","Profiling","Memory"]
date: "2026-06-16"
readingTime: "9 min read"
coverImage: "/assets/images/blogs/jvm-heap-dump-walkthrough.webp"
author: "Gaurav Kumar"
featured: false
visible: true
draft: false
relatedPosts: ["cache-invalidation-correctness","service-boundaries-domain-seams"]
---

Memory investigations feel harder than they are, mostly because the first heap dump you open contains millions of objects and no obvious place to start. The process below is the one I keep coming back to, and it turns an open-ended hunt into about four concrete steps.

## Confirm it is actually a leak

High memory usage is not a leak. The JVM is supposed to use the heap it was given. A leak has a specific signature, which is that live heap after a full collection grows over time and never returns to its earlier baseline.

Look at garbage collection logs before you look at a dump. If used heap after each full collection is flat, you have a sizing or allocation-rate question, not a leak, and a heap dump will mostly waste your afternoon.

```bash
# GC logging, which is the cheapest diagnostic you can leave on in production
-Xlog:gc*:file=/var/log/app/gc.log:time,uptime:filecount=5,filesize=20M

# capture a dump automatically when the heap is actually exhausted
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/log/app/heapdump.hprof
```

:::warning Taking a dump has a cost
A manual heap dump pauses the application for roughly as long as it takes to write the heap to disk. On a multi-gigabyte heap that is not a quiet operation. Take it from one instance out of rotation where you can.
:::

## Sort by retained size, not shallow size

This is the single most useful habit. Shallow size is the memory an object occupies by itself, which for a collection is almost nothing. Retained size is everything that would be freed if that object were collected, which is what you actually care about.

Open the dump, run the dominator tree, and sort by retained heap. The answer is usually in the top five rows. A `HashMap` holding two gigabytes has a shallow size of about forty-eight bytes, so a shallow-size sort will never show it to you.

## Follow the path to the GC root

Once you have the suspect, the question is not what it is but why it is still alive. Every retained object has a chain of references back to a garbage collection root, and that chain names the bug.

In my experience the chain usually ends in one of a small number of places.

- A `static` collection used as a cache with no eviction policy at all.
- A `ThreadLocal` that was set and never removed, held alive by a pooled thread that outlives the request.
- Listeners or callbacks registered on a long-lived object and never deregistered.
- A non-static inner class quietly holding a reference to its enclosing instance.
- A session or context object accumulating per-request data across requests.

```java
// the classic: a pooled thread keeps this alive long after the request ends
private static final ThreadLocal<RequestContext> CONTEXT = new ThreadLocal<>();

public void handle(Request request) {
    CONTEXT.set(RequestContext.from(request));
    try {
        process(request);
    } finally {
        CONTEXT.remove();  // without this, the pool leaks one context per thread
    }
}
```

## Check duplicates before you refactor

Before assuming an architectural problem, look at duplicate strings and duplicate byte arrays. It is common to find hundreds of megabytes of identical strings produced by parsing the same configuration or the same catalogue feed repeatedly.

That is a cheap fix. Interning at the parse boundary, or simply not re-parsing, can remove the problem without touching the design.

## Verify with the same measurement

After the fix, rerun the same load against the same data volume and compare live heap after full collection against the original baseline. A memory fix verified by a different measurement than the one that found it is not verified.

:::note Leave the instrumentation on
GC logging and a heap-usage alert cost almost nothing to run. The point of the investigation is that the next occurrence gets caught by a graph rather than by a customer.
:::
