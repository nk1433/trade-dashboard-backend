# Upstox Market Data Backend

## Overview

This backend service provides APIs and automated processes to fetch, aggregate, and store important market data metrics for financial instruments using Upstox market data.

---

## Current Features

### 1. Sync 52-Week Stats (`/sync-52week-stats`)

- Fetches historical candle data (1 year) for a list of instruments.
- Calculates 52-week high and low prices for each instrument.
- Computes technical metrics such as 10-day, 21-day, and 50-day Exponential Moving Averages (EMA).
- Aggregates and stores these statistics in a PostgreSQL database.
- Uses upsert operations to keep the data updated.

### 2. Daily Sync API for Current Day Candles (`/sync-daily-stats`)

- Accepts current day candle data per instrument.
- Updates 10/21/50 day EMA values incrementally using previous day's EMA from DB.
- Checks and updates 52-week high/low if today's prices exceed stored values.
- Enables precise daily updates without re-fetching full historical data.

---

## Upcoming Features / Enhancements (Placeholders)

- [ Ref ] - For daily sync kindly check the syncup already happened or not.
- [ Ref ] - To reduce Read/Write cost, take the sync locally and import the data directly through mongo compass
- [ Func ] - Add one more column called +-4% moves in last 21 days
- [ Func ] - Add one more column dollar volume trade value -> closePrice * volume

