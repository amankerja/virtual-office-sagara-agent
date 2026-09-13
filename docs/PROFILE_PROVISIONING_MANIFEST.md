# SAGARA AI — PROFILE PROVISIONING MANIFEST

```text
================================================================================
SAGARA_HERMES_PROFILE_PROVISIONING_MANIFEST
STATUS: COMPLETE & AUDITED
PROVISIONED AT: 2026-09-11T06:58:09Z
HERMES VERSION: Hermes Agent v0.20.6 (2026.8.27) · upstream 45a6101f · local a9c783f2
SOURCE SEED HASH: cf40ab855ee5c13c8353679be49b82bc0340eaaf0d98cbd764413e906e848ca0
FLEET ASSIGNMENT HASH: c93038cf4a37fcb42fe20fca671e3fb89987a1af325874669e8fcad662f36797
HOST: VM-17-49-ubuntu (ubuntu)
================================================================================
```

## 1. Provisioning Run Metadata

* **Run ID:** `run-20260911-065809`
* **Execution Boundary:** Configuration only; 0 LLM calls, 0 sessions created, 0 gateway restarts.
* **Hermes Profiles Root:** `/home/ubuntu/.hermes/profiles`
* **Central Default Profile:** `/home/ubuntu/.hermes` (PRESERVED & UNTOUCHED)
* **Pre-existing Legacy Profile:** `career` (PRESERVED & REPORT-ONLY)

---

## 2. Canonical Profile Manifest Table

| Profile ID | Target Directory | Provisioned Files | SOUL SHA-256 | Model Config | Hermes Targetability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`lead`** | `~/.hermes/profiles/lead` | `SOUL.md`, `config.yaml`, `profile.yaml` | `080d0c82e05f81c780cec1a9edc2f1cbf9fdc0037c3bcf9038f23da58ecea3a8` | `gratisan_and_googlepro` (`custom:9router`) | **TARGETABLE** |
| **`personal`** | `~/.hermes/profiles/personal` | `SOUL.md`, `config.yaml`, `profile.yaml` | `b81dbda9fcb49c2ec85b05a4ee7cdb1788191ce443c944ae86ed53c6abd7716a` | `gratisan_and_googlepro` (`custom:9router`) | **TARGETABLE** |
| **`business`** | `~/.hermes/profiles/business` | `SOUL.md`, `config.yaml`, `profile.yaml` | `5c5189f7a4e188f4e96d0b81b75421c9a2d030e0daf357d0ee2dcdf94710b0f7` | `gratisan_and_googlepro` (`custom:9router`) | **TARGETABLE** |
| **`marketing`** | `~/.hermes/profiles/marketing` | `SOUL.md`, `config.yaml`, `profile.yaml` | `2e71ec13b4a20e38d056eb72b51ade96ae03fb3bd218e70f6e0e16afeee5c5b0` | `gratisan_and_googlepro` (`custom:9router`) | **TARGETABLE** |
| **`cs`** | `~/.hermes/profiles/cs` | `SOUL.md`, `config.yaml`, `profile.yaml` | `41c39db77d99d1622d849055c70fe3ba659ba158839327ee6f4d432f298d0e24` | `gratisan_and_googlepro` (`custom:9router`) | **TARGETABLE** |
| **`it-support`** | `~/.hermes/profiles/it-support` | `SOUL.md`, `config.yaml`, `profile.yaml` | `3ac4d0bcd0481bc618e0111c85d00ee5e0fc9021b01b578410b488d61edee12f` | `gratisan_and_googlepro` (`custom:9router`) | **TARGETABLE** |
| **`it-coding`** | `~/.hermes/profiles/it-coding` | `SOUL.md`, `config.yaml`, `profile.yaml` | `7827c233d23be83f554ad5731b7811c178c5311a2e99f0a5ce9b219d8457a212` | `gratisan_and_googlepro` (`custom:9router`) | **TARGETABLE** |
| **`sagara-lab`** | `~/.hermes/profiles/sagara-lab` | `SOUL.md`, `config.yaml`, `profile.yaml` | `76acfeb9e82a9e2fbceb7bb94e73ad917b4fc735f7bf5af5ac93a9d866eda687` | `gratisan_and_googlepro` (`custom:9router`) | **TARGETABLE** |

---

## 3. Secret & Credential Audit Summary

* **Secrets Copied from Default:** `0`
* **Plaintext Tokens Duplicated:** `0`
* **Environment Credential Files (`.env`):** Created with owner-only permissions (`0600`), zero non-comment lines.
* **Provider Reference Scheme:** All model configs reference `key_env: NINEROUTER_API_KEY` (no hardcoded tokens).
* **Secret Pattern Scan Findings:** `0` across all provisioned files.

---

## 4. Service Integrity Verification

* **Gateway Service:** `hermes-gateway.service`
  - MainPID: `2909737` (UNCHANGED)
  - NRestarts: `0` (UNCHANGED)
  - ActiveState: `active`
  - SubState: `running`
* **Default Profile Root Hashes:**
  - `config.yaml`: `4549776c4c3ea5b5415f463270d291d9e586ff339c68294bbac4f2e934157713` (UNCHANGED)
  - `.env`: `3cca9f8cc4d36cfe4b3d44f1eae7b00ff7595e14650f0c33dc4680b62ec93310` (UNCHANGED)
  - `SOUL.md`: `3bd38ef92efb90d0fdda1bb73036185d4a4bc11079963cb0e2db71c84281e64e` (UNCHANGED)
* **Active Session Counts:**
  - `lead`: `0`
  - `personal`: `1` (historical session preserved)
  - `business`: `0`
  - `marketing`: `0`
  - `cs`: `0`
  - `it-support`: `0`
  - `it-coding`: `0`
  - `sagara-lab`: `3` (historical sessions preserved)
  - **New Sessions Created by Provisioning:** `0`
