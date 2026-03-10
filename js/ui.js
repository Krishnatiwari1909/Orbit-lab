import { STATE, resetSimulation, BATTERY_CAPACITY_WH, SOLAR_FULL_OUTPUT_W } from './simulation.js';
import { toggleComponent } from './satellite.js';
import { resetTarget } from './scene.js';

import { API_BASE_URL } from './config.js';

import { analyzeText } from "./ai/languageAnalyzer.js";

let lastAIPanelMode = null;

export function updateAIAvailability(simState = STATE) {
    const isMissionOps = simState?.mode === 'sim';
    const isRunning = simState?.running === true;
    const isPaused = simState?.paused === true;
    const hasOBC = simState?.installed?.obc === true;
    const hasPayload = simState?.installed?.payload === true;

    // --- Mission Advisor panel message (state-based; do not rely on errors) ---
    const advisorText = document.getElementById('ai-text');
    if (advisorText) {
        if (!isMissionOps) {
            advisorText.innerText = "AI features available in Mission Ops only.";
        } else if (!isRunning) {
            advisorText.innerText = "Awaiting live telemetry…";
        } else if (isPaused) {
            advisorText.innerText = "Mission paused. Awaiting telemetry…";
        } else if (!hasOBC) {
            advisorText.innerText = "AI Mission Advisor requires the Flight Computer (OBC) to be installed.";
        }
    }

    // --- Vision AI panel/button gating ---
    const visionBtn = document.getElementById('vision-btn');
    const visionOut = document.getElementById('vision-output');
    if (visionBtn) {
        const enabled = isMissionOps && isRunning && hasPayload;
        visionBtn.disabled = !enabled;
        visionBtn.style.opacity = enabled ? '1' : '0.5';
        visionBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }
    if (visionOut) {
        if (!isMissionOps) {
            visionOut.innerText = "Payload analysis available during Mission Ops with imaging payload installed.";
        } else if (!hasPayload) {
            visionOut.innerText = "Install Optical Imaging Payload to enable analysis.";
        } else if (!isRunning) {
            visionOut.innerText = "Payload analysis available after mission start.";
        }
    }

    // --- Language AI gating + output ---
    const languageBtn = document.getElementById('analyze-health');
    const languageOut = document.getElementById('language-output');
    if (languageBtn) {
        const enabled = isMissionOps && isRunning;
        languageBtn.disabled = !enabled;
        languageBtn.style.opacity = enabled ? '1' : '0.5';
        languageBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }
    if (languageOut && !isMissionOps) {
        languageOut.innerText = "System health analysis is available during Mission Ops.";
    } else if (languageOut && isMissionOps && !isRunning) {
        languageOut.innerText = "Start the mission (INITIATE) to analyze live telemetry.";
    }
}

/**
 * Centralized function to reset all AI UI panels to their initial/inactive state.
 * Called on: mode switch to Assembly, simulation reset, mission change.
 */
export function resetAIUIState() {
    // Clear Vision AI file input
    const visionFile = document.getElementById('vision-file');
    if (visionFile) visionFile.value = '';

    // Clear Language AI output
    const languageOut = document.getElementById('language-output');
    if (languageOut) languageOut.innerText = '';

    // Re-apply centralized availability rules
    updateAIAvailability(STATE);
}

const ui = {
    bat: document.getElementById('stat-battery'),
    sol: document.getElementById('stat-solar'),
    stat: document.getElementById('stat-status'),
    comm: document.getElementById('stat-comm'),

    missionPanel: document.getElementById('mission-panel'),
    timeDisplay: document.getElementById('orbit-timer'),
    phaseDisplay: document.getElementById('orbit-phase-text'),
    modeLabel: document.getElementById('mode-label'),
    timeBtns: document.querySelectorAll('.t-btn'),

    payloadPanel: document.getElementById('payload-vision-panel'),

    // Command Deck
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    btnReset: document.getElementById('btn-reset')
};

const SUBSYSTEMS = [
    { 
        id: 'battery', 
        name: 'Li-Ion Battery Pack', 
        drain: 0, 
        desc: `<strong>Primary Energy Storage</strong><br>
                Capacity: ${BATTERY_CAPACITY_WH} Wh | Voltage: 14.4V<br>
                Stores solar energy for eclipse periods (35min/orbit).<br>
                Status: Monitors charge state & thermal limits.<br>
                <span style="color:#00ff9d">Critical for mission survival.</span>` 
    },
    { 
        id: 'solar', 
        name: 'Deployable Solar Wings', 
        drain: SOLAR_FULL_OUTPUT_W, 
        desc: `<strong>Power Generation System</strong><br>
                Output: ${SOLAR_FULL_OUTPUT_W}W in Sunlight | 0W in Eclipse<br>
                2x foldable panels, ~0.6m² total area<br>
                Charges battery & powers live loads simultaneously.<br>
                <span style="color:#ffb86c">Disable to simulate panel failure.</span>` 
    },
    { 
        id: 'obc', 
        name: 'Flight Computer (OBC)', 
        drain: 2.0, 
        desc: `<strong>Command & Control Unit</strong><br>
                Power: 2.0W baseline | ~50 MHz ARM Cortex<br>
                Manages attitude control, telemetry, mission logic.<br>
                Failure = satellite tumbles, no commands possible.<br>
                <span style="color:#ff4757">Essential for operations.</span>` 
    },
    { 
        id: 'comm', 
        name: 'S-Band Radio (Transceiver)', 
        drain: 5.0, 
        desc: `<strong>Telemetry & Ground Link</strong><br>
                Power: 5.0W TX | 2.0W RX | Range: ~40,000 km<br>
                Uplink commands: 125 kbps | Downlink data: 256 kbps<br>
                Requires OBC to function. Shows link status in footer.<br>
                <span style="color:#00ff9d">Mission requires ground contact.</span>` 
    },
    { 
        id: 'payload', 
        name: 'Optical Imaging Payload', 
        drain: 8.0, 
        desc: `<strong>Primary Mission Instrument</strong><br>
                Power: 8.0W (imaging) | 50MP RGB Camera<br>
                Spectral: VIS 400-700nm | GSD: 45m @ nadir<br>
                Requires OBC for timing & comm for downlink.<br>
                <span style="color:#3fd1ff">Payload is mission success metric.</span>` 
    }
];

export function initUI(setModeCallback) {
    const list = document.getElementById('component-list');
    const info = document.getElementById('info-text');

    if (list) {
        SUBSYSTEMS.forEach(sys => {
            const div = document.createElement('div');
            div.className = 'component-item';
            div.innerHTML = `<span class="comp-name">${sys.name}</span><div class="comp-status"></div>`;

            div.onclick = () => {
                STATE.installed[sys.id] = !STATE.installed[sys.id];
                toggleComponent(sys.id, STATE.installed[sys.id]);
                div.classList.toggle('active');

                updateAIAvailability(STATE);
            };

            div.onmouseenter = () => {
                const drainText = sys.drain > 0 ? `<span style="color:var(--accent-warn)">Load: -${sys.drain.toFixed(1)}W</span>` : `<span style="color:var(--accent-green)">Generator / Storage</span>`;
                if (info) info.innerHTML = `<div style="margin-bottom:8px">${drainText}</div>${sys.desc}`;
            };
            div.onmouseleave = () => { if (info) info.innerHTML = `<span style="color:var(--text-dim)">Select components to build your satellite. Hover over any subsystem to view technical specifications and mission impact.</span>`; };
            list.appendChild(div);
        });
    }

    if (ui.timeBtns) {
        ui.timeBtns.forEach(btn => {
            btn.onclick = () => {
                ui.timeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                STATE.timeScale = parseInt(btn.dataset.scale);
            };
        });
    }

    // --- BUTTON LOGIC ---

    // 1. START
    if (ui.btnStart) {
        ui.btnStart.onclick = () => {
            STATE.running = true;
            STATE.paused = false;

            ui.btnStart.disabled = true;
            ui.btnPause.disabled = false;
            ui.btnPause.innerText = "PAUSE";
            ui.btnPause.style.background = ""; // Reset style
            ui.btnReset.disabled = false;

            updateAIAvailability(STATE);
        };
    }

    // 2. PAUSE
    if (ui.btnPause) {
        ui.btnPause.onclick = () => {
            if (!STATE.running) return;

            STATE.paused = !STATE.paused; // Toggle

            ui.btnPause.innerText = STATE.paused ? "RESUME" : "PAUSE";

            // Visual toggle
            if (STATE.paused) {
                ui.btnPause.style.background = "#fff";
                ui.btnPause.style.color = "#000";
            } else {
                ui.btnPause.style.background = ""; // Default CSS
                ui.btnPause.style.color = "";
            }

            updateAIAvailability(STATE);
        };
    }

    // 3. RESET
    if (ui.btnReset) {
        ui.btnReset.onclick = () => {
            resetSimulation();
            updateUIStats({ input: 0, timeStr: "T+00:00:00", phase: "PRE-LAUNCH", isEclipse: false });

            ui.btnStart.disabled = false;
            ui.btnPause.disabled = true;
            ui.btnPause.innerText = "PAUSE";
            ui.btnPause.style.background = "";
            ui.btnReset.disabled = true;

            if (ui.payloadPanel) ui.payloadPanel.style.display = 'none';
            
            // Reset all AI UI panels using centralized function
            resetAIUIState();

            updateAIAvailability(STATE);
        };
    }

    const bBuild = document.getElementById('btn-build');
    const bSim = document.getElementById('btn-sim');
    if (bBuild) bBuild.onclick = (e) => {
        setModeCallback('build', e.target);
        resetAIUIState();
        updateAIAvailability(STATE);
        resetTarget();
    };
    if (bSim) bSim.onclick = (e) => {
        setModeCallback('sim', e.target);
        resetAIUIState();
        updateAIAvailability(STATE);
    };

    // Register Language AI click handler once (UI output, no alerts)
    const languageBtn = document.getElementById('analyze-health');
    if (languageBtn && !languageBtn.dataset.bound) {
        languageBtn.dataset.bound = 'true';
        languageBtn.onclick = async () => {
            updateAIAvailability(STATE);

            const languageOut = document.getElementById('language-output');
            const isMissionOps = STATE.mode === 'sim';
            if (!isMissionOps) {
                if (languageOut) languageOut.innerText = "System health analysis is available during Mission Ops.";
                return;
            }
            if (!STATE.running) {
                if (languageOut) languageOut.innerText = "Start the mission (INITIATE) to analyze live telemetry.";
                return;
            }

            const batteryStr = STATE.battery > 20 ? "good" : STATE.battery > 0 ? "critical" : "depleted";
            const telemetryStatus = STATE.installed.comm ? "LINK ACTIVE" : "NO ANTENNA";

            const report = `System Status Report:\n` +
                `Battery: ${STATE.battery.toFixed(1)}% (${batteryStr})\n` +
                `Solar: ${STATE.installed.solar ? "Active" : "Inactive"}\n` +
                `Telemetry: ${telemetryStatus}\n` +
                `OBC: ${STATE.installed.obc ? "Installed" : "Not installed"}\n` +
                `Payload: ${STATE.installed.payload ? "Installed" : "Not installed"}`;

            if (languageOut) languageOut.innerText = "Analyzing telemetry…";

            const result = await analyzeText(report);
            if (result.error) {
                if (languageOut) languageOut.innerText = "AI service unavailable. Please try again later.";
                return;
            }

            const scores = result.confidenceScores;
            const scoreStr = scores
                ? `pos:${(scores.positive * 100).toFixed(0)}% neu:${(scores.neutral * 100).toFixed(0)}% neg:${(scores.negative * 100).toFixed(0)}%`
                : "";
            if (languageOut) {
                languageOut.innerText = `Sentiment: ${result.sentiment}${scoreStr ? ` (${scoreStr})` : ""}\n\n${report}`;
            }
        };
    }

    // Expose centralized updater for non-module callers (no new state, just a function)
    window.updateAIAvailability = () => updateAIAvailability(STATE);

    // AI dropdown panels (accordion)
    initAIDropdownPanels();
    
    // Initialize main panel collapse controls
    initMainPanelCollapseControls();
}

async function analyzePayloadImage() {
  const input = document.getElementById("payloadImageUrl");
  const output = document.getElementById("payloadResult");

  const imageUrl = input.value.trim();

  if (!imageUrl) {
    output.innerHTML = "⚠️ Please enter an image URL.";
    return;
  }

    output.innerHTML = "🔍 Analyzing image...";

  try {
        const response = await fetch(`${API_BASE_URL}/visionAnalyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ imageUrl })
        });

    if (!response.ok) {
      throw new Error("Vision service unavailable");
    }

    const data = await response.json();

    renderPayloadInsights(data);

  } catch (err) {
        output.innerHTML = "AI service unavailable. Please try again later.";
  }
}

/**
 * Initialize collapse/expand controls for main side panels (Subsystems & Mission Ops).
 * Adds event listeners to collapse buttons and side tabs.
 */
function initMainPanelCollapseControls() {
    // Get all collapse buttons and side tabs
    const collapseButtons = document.querySelectorAll('.panel-collapse-btn');
    const collapsedTabs = document.querySelectorAll('.collapsed-tab');

    const getCollapsedTabForPanel = (panelId) => {
        return document.querySelector(`.collapsed-tab[data-panel="${panelId}"]`);
    };

    const setCollapsed = (panelId, collapsed) => {
        const panel = document.getElementById(panelId);
        const tab = getCollapsedTabForPanel(panelId);
        if (!panel) return;

        panel.classList.toggle('collapsed', collapsed);

        if (tab) {
            tab.classList.toggle('visible', collapsed);
            tab.setAttribute('aria-hidden', collapsed ? 'false' : 'true');
        }
    };
    
    // Add click handlers to collapse buttons
    collapseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const panelId = button.dataset.panel;
            if (!panelId) return;
            setCollapsed(panelId, true);
        });
    });
    
    // Add click handlers to fixed collapsed tabs (expand panels)
    collapsedTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const panelId = tab.dataset.panel;
            if (!panelId) return;
            setCollapsed(panelId, false);
        });
    });

    // Ensure tabs reflect initial DOM state
    ['sidebar', 'mission-panel'].forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        setCollapsed(panelId, panel.classList.contains('collapsed'));
    });
}

function initAIDropdownPanels() {
    const aiPanels = document.querySelectorAll('#mission-panel .ai-panel');
    if (!aiPanels || aiPanels.length === 0) return;

    const setExpanded = (panel, expanded, animate = true) => {
        const body = panel.querySelector(':scope > .ai-panel-body');
        const headerBtn = panel.querySelector(':scope > .ai-panel-header');
        if (!body || !headerBtn) return;

        panel.classList.toggle('expanded', expanded);
        headerBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');

        // Helper: once expansion animation finishes, remove max-height restriction.
        const onExpandDone = () => {
            // Only unlock if still expanded.
            if (!panel.classList.contains('expanded')) return;
            body.style.maxHeight = '';
        };

        if (!animate) {
            body.style.transition = 'none';
        }

        if (expanded) {
            // Ensure we start from 0 for a clean open animation.
            if (animate) {
                body.style.maxHeight = '0px';
                // Next frame: expand to measured height.
                requestAnimationFrame(() => {
                    body.style.maxHeight = `${body.scrollHeight}px`;
                });

                // After transition, switch to max-height:none via CSS (by clearing inline maxHeight).
                body.addEventListener('transitionend', (e) => {
                    if (e.propertyName !== 'max-height') return;
                    onExpandDone();
                }, { once: true });

                // Fallback: if transitionend doesn't fire (rapid toggles), still unlock.
                setTimeout(onExpandDone, 360);
            } else {
                // No animation: jump straight to expanded with no max-height restriction.
                body.style.maxHeight = '';
            }
        } else {
            // Collapse to 0.
            // If currently unrestricted (max-height:none), set to a px value first so it can animate.
            body.style.maxHeight = `${body.scrollHeight}px`;
            if (animate) {
                requestAnimationFrame(() => {
                    body.style.maxHeight = '0px';
                });
            } else {
                body.style.maxHeight = '0px';
            }
        }

        if (!animate) {
            // Re-enable transitions after state is applied.
            requestAnimationFrame(() => {
                body.style.transition = '';
            });
        }
    };

    const togglePanel = (panel) => {
        const expanded = panel.classList.contains('expanded');
        setExpanded(panel, !expanded, true);
    };

    aiPanels.forEach(panel => {
        if (panel.dataset.aiDropdownBound === 'true') return;
        panel.dataset.aiDropdownBound = 'true';

        const headerBtn = panel.querySelector(':scope > .ai-panel-header');
        const body = panel.querySelector(':scope > .ai-panel-body');
        if (!headerBtn || !body) return;

        headerBtn.addEventListener('click', () => togglePanel(panel));
        headerBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePanel(panel);
            }
        });

        // Start collapsed; defaults applied by mode.
        setExpanded(panel, false, false);
    });

    // Keep max-height in sync when expanded and viewport changes.
    window.addEventListener('resize', () => {
        aiPanels.forEach(panel => {
            if (!panel.classList.contains('expanded')) return;
            const body = panel.querySelector(':scope > .ai-panel-body');
            if (!body) return;
            // Only update if we're mid-animation (inline max-height set).
            if (body.style.maxHeight) {
                body.style.maxHeight = `${body.scrollHeight}px`;
            }
        });
    });
}

function applyAIPanelDefaultsForMode(mode) {
    const advisor = document.getElementById('ai-advisor');
    const vision = document.getElementById('payload-vision-panel');
    const language = document.getElementById('language-panel');
    const panels = [advisor, vision, language].filter(Boolean);

    const setExpanded = (panel, expanded) => {
        const body = panel.querySelector(':scope > .ai-panel-body');
        const headerBtn = panel.querySelector(':scope > .ai-panel-header');
        if (!body || !headerBtn) return;

        panel.classList.toggle('expanded', expanded);
        headerBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        // Default states should not impose max-height when open.
        body.style.maxHeight = expanded ? '' : '0px';
    };

    if (mode === 'sim') {
        // Mission Ops defaults
        if (advisor) setExpanded(advisor, true);
        if (vision) setExpanded(vision, false);
        if (language) setExpanded(language, false);
    } else {
        // Assembly defaults
        panels.forEach(p => setExpanded(p, false));
    }
}

export function updateUIStats(simData) {
    const { input, timeStr, phase, isEclipse } = simData;

    const missionCollapsedTab = document.querySelector('.collapsed-tab[data-panel="mission-panel"]');

    if (STATE.mode === 'sim') {
        if (ui.missionPanel) ui.missionPanel.style.display = 'block';
        if (ui.payloadPanel) ui.payloadPanel.style.display = 'block';
        if (ui.timeDisplay) ui.timeDisplay.innerText = timeStr;
        if (ui.phaseDisplay) {
            ui.phaseDisplay.innerText = phase;
            ui.phaseDisplay.style.color = isEclipse ? 'var(--accent-blue)' : 'var(--accent-warn)';
        }
        if (ui.modeLabel) {
            ui.modeLabel.innerText = "MISSION MODE — LIVE SIMULATION";
            ui.modeLabel.style.color = "var(--accent-green)";
        }

        // Only show the Mission collapsed tab in Mission Ops, and only when collapsed.
        if (ui.missionPanel && missionCollapsedTab) {
            const isCollapsed = ui.missionPanel.classList.contains('collapsed');
            missionCollapsedTab.classList.toggle('visible', isCollapsed);
            missionCollapsedTab.setAttribute('aria-hidden', isCollapsed ? 'false' : 'true');
        }
    } else {
        if (ui.missionPanel) ui.missionPanel.style.display = 'none';
        if (ui.payloadPanel) ui.payloadPanel.style.display = 'none';

        // Assembly mode must not show Mission collapsed tab.
        // Also clear the collapsed state so CSS sibling rules can't surface the tab.
        if (ui.missionPanel) ui.missionPanel.classList.remove('collapsed');
        if (missionCollapsedTab) {
            missionCollapsedTab.classList.remove('visible');
            missionCollapsedTab.setAttribute('aria-hidden', 'true');
        }

        if (ui.modeLabel) {
            ui.modeLabel.innerText = "ASSEMBLY MODE — CONFIGURATION ONLY";
            ui.modeLabel.style.color = "var(--accent-warn)";
        }
    }

    // Apply AI dropdown default states only on mode transitions.
    if (STATE.mode !== lastAIPanelMode) {
        lastAIPanelMode = STATE.mode;
        applyAIPanelDefaultsForMode(STATE.mode);
    }

    if (ui.bat) {
        const batLvl = Math.floor(STATE.battery);
        const storedWh = ((STATE.battery / 100.0) * BATTERY_CAPACITY_WH).toFixed(2);
        ui.bat.innerText = `${batLvl}% (${storedWh} Wh)`;
        if (batLvl > 20) ui.bat.className = 'stat-value good';
        else if (batLvl > 0) ui.bat.className = 'stat-value warn';
        else ui.bat.className = 'stat-value crit';
    }

    if (ui.sol) {
        ui.sol.innerText = (STATE.mode === 'build' || !STATE.running) ? "N/A" : input.toFixed(1) + ' W';
        ui.sol.style.color = input > 1 ? 'var(--accent-warn)' : '#777';
    }

    if (ui.stat && ui.comm) {
        if (STATE.mode === 'build' || !STATE.running) {
            ui.stat.innerText = STATE.mode === 'build' ? "CONFIG" : "READY";
            ui.stat.className = "stat-value";
            ui.comm.innerText = "IDLE";
            ui.comm.className = "stat-value";
        } else {
            if (STATE.battery <= 0) {
                ui.stat.innerText = "POWER LOSS"; ui.stat.className = "stat-value crit";
                ui.comm.innerText = "SILENT"; ui.comm.className = "stat-value crit";
            } else if (!STATE.installed.obc) {
                ui.stat.innerText = "NO COMPUTER"; ui.stat.className = "stat-value crit";
                ui.comm.innerText = "OFFLINE"; ui.comm.className = "stat-value crit";
            } else {
                ui.stat.innerText = "NOMINAL"; ui.stat.className = "stat-value good";
                if (STATE.installed.comm) {
                    ui.comm.innerText = "LINK ACTIVE"; ui.comm.className = "stat-value good";
                } else {
                    ui.comm.innerText = "NO ANTENNA"; ui.comm.className = "stat-value warn";
                }
            }
        }
    }

    // Keep AI buttons/messages in sync with sim lifecycle.
    updateAIAvailability(STATE);
}






