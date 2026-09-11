# Third-Party Notices & Attribution

## Hermes3D
The Sagara Mission Control 3D Virtual Office renderer studies architectural and operational patterns inspired by **Hermes3D** (https://github.com/iamlukethedev/Hermes3D).

### License Notice
MIT License

Copyright (c) 2025 iamlukethedev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### Sagara Adaptations & Technical Differences
Sagara Mission Control implements an original, clean-room TypeScript & React Three Fiber architecture tailored to Sagara enterprise mission operations:
1. **Unified Operational State**: Consumes Sagara canonical `OfficeSceneProjection` without standalone game/3D state.
2. **Operations Focus**: Omits game mechanics (no phaser office, gym, dancing, ping-pong, jukebox, or random wandering). All animations reflect verified operational states (`ACTIVE`, `IDLE`, `AWAITING_APPROVAL`, `DEGRADED`, etc.).
3. **Dedicated Architectural Zones**: Models Sagara Command Room, Specialist Zones, Approval Pod with real-time risk indicators, Server Room with gateway telemetry LEDs, and Artifact Vault.
4. **Resilient Multi-Renderer**: Seamless switching between Immersive 3D, Efficient 2.5D, and Accessible List views with automatic WebGL detection and fallback.
