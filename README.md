# HW05 – k6 Performance Test Plans

This public repository contains the HW05 EShop performance-test plans and their CSV input data.

## Workflow

Login → read product categories → add the CSV-selected product to the cart.

The plans call the SUT API directly; they do not measure browser rendering. The default SUT URL is `http://localhost:3000`. Start the seeded EShop backend separately before running a plan.

## Test plans

| Scenario | Plan |
|---|---|
| Load | `test-plans/23120040_Load_20261122.js` |
| Stress | `test-plans/23120040_Stress_20261122.js` |
| Spike | `test-plans/23120040_Spike_20261122.js` |
| Endurance | `test-plans/23120040_Endurance_20261122.js` |

`test-plans/journey.js` contains the shared workflow. `data/users-products.csv` supplies the test account and selected products. The Endurance plan is included to make the reported endurance point reproducible.

## Run

Install k6, start the SUT, set the seeded test account password in your local PowerShell session, then run a plan from the repository root. Do not commit or share the password:

```powershell
$env:ESHOP_PASSWORD = "<seeded test account password>"
k6 run test-plans/23120040_Load_20261122.js
```

Run the other scenario files the same way. Each plan writes its summary under `results/reports/`; the raw run evidence and full analysis are maintained with the HW05 submission materials.
