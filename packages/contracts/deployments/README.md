# Deployments

`script/Deploy.s.sol` writes `<chainId>.json` here after every run (deploy or verify). Addresses are
deterministic (CREATE2), so these files are a record, not state: re-running the script on a chain
where the contracts already exist is a no-op. Commit the files for Base Sepolia (`84532.json`) and
Base (`8453.json`) after a deployment so the addresses are reviewable in git. Local Anvil runs
(`31337.json`) are ignored.
