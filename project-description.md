# Deadlock Ranking Simulator

A tool used to simulate how players rank will change in the July 2026 patch of Deadlock that introduced the new ranking system.

## Tech

- React
- Typescript

## Background

This is the matchmaking update: https://deadlock.wiki/Update:July_30,_2026

There is some contention in the community about whether this update unfairly allows bad players (with low win rate) to rise in rank and continue to play with players better than them.

My hypothesis is that good players will rise in rank faster even if they play less and therefore will outpace the bad players.

## Design

Create scripts that generate different data sets as JSON files. A simulation is just scripts that transform the data. The React front-end displays the data as nice graphs and visualizations.

## Simulations

### Propagation of players under ideal conditions

- Population of 10,000 players.
- Uniformly split across the starting ranks.
- Assume a win rate distribution from 20% to 80%.
- Params: Number of days to simulate, average games per day.
