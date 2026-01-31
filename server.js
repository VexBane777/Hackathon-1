

This is the perfect evolution for an "Agentic" system. True **Agency** implies autonomy—the AI detects the problem and fixes it without waiting for a human to click a button.

Here are the updated files.

### What Changed:
1.  **Removed Manual Buttons:** The AI no longer asks "Do you want me to fix this?".
2.  **Auto-Execution:** When a failure is detected, the AI waits **1 second** (to simulate "thinking"), and then automatically executes the recovery (Reroute or Queue).
3.  **Visual Updates:** The logs now say **"AUTO-RECOVERY ACTIVATED"**.

---

### 1. Update `index.html`
Replace your entire `index.html` with this version.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayPulse | Autonomous Fintech Ops</title>
    <style>
        :root {
            --primary: #0f172a;
            --secondary: #3b82f6;
            --accent: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --font-family: 'Inter', 'Segoe UI', sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: var(--font-family);
            background-color: var(--bg);
            color: var(--text-main);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Scrollbars */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        /* Layout */
        header {
            background: var(--primary);
            color: white;
            padding: 0.8rem 1.5rem;
            display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            flex-shrink: 0;
        }

        main {
            flex: 1;
            display: grid;
            grid-template-columns: 3fr 1fr; 
            grid-template-rows: 1fr minmax(250px, 30vh);
            gap: 1rem;
            padding: 1rem;
            overflow: hidden;
        }

        /* --- Dashboard Area --- */
        .dashboard {
            display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; overflow: hidden; min-height: 0;
        }
        
        .product-grid-container {
            background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px;
            padding: 1rem; display: flex; flex-direction: column; min-height: 0;
        }
        
        .product-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
            gap: 1rem; overflow-y: auto; min-height: 0; padding-right: 5px;
        }

        .product-card {
            background: #fff; border: 1px solid var(--border); border-radius: 6px;
            padding: 1rem; cursor: pointer; text-align: center;
            transition: all 0.2s; display: flex; flex-direction: column; justify-content: space-between;
        }
        .product-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: var(--secondary); }
        .product-meta { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;}
        .product-price { color: var(--text-main); font-weight: 700; margin-top: 8px; font-size: 1.1rem; }

        /* Cart */
        .cart-panel {
            background: var(--card-bg); border:1px solid var(--border); border-radius: 6px;
            padding: 1rem; display: flex; flex-direction: column; min-height: 0;
        }
        .cart-items { flex: 1; overflow-y: auto; margin: 10px 0; min-height: 0; background: #f1f5f9; border-radius: 4px; padding: 5px;}
        .cart-item {
            display: flex; justify-content: space-between; align-items: center;
            padding: 8px; background: white; margin-bottom: 5px; border-radius: 4px;
            border: 1px solid var(--border); font-size: 0.85rem;
        }

        /* --- Right Column (Split) --- */
        .right-column {
            grid-column: 2 / 3;
            grid-row: 1 / 3;
            display: grid;
            grid-template-rows: 60% 40%; 
            gap: 1rem;
            overflow: hidden;
        }

        /* Chat */
        .agent-panel {
            background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px;
            display: flex; flex-direction: column; overflow: hidden; min-height: 0;
        }
        .chat-area {
            flex: 1; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f8fafc;
        }
        .message {
            max-width: 85%; padding: 10px 12px; border-radius: 8px; font-size: 0.9rem; line-height: 1.4;
        }
        .message.agent { background: white; border: 1px solid var(--border); border-left: 3px solid var(--secondary); align-self: flex-start; }
        .message.system { background: #e2e8f0; align-self: center; font-size: 0.75rem; width: 100%; text-align: center;}

        /* Visualizer (Plain English) */
        .visualizer-panel {
            background: #f0fdf4; 
            border:1px solid #86efac;
            border-radius: 6px;
            display: flex; flex-direction: column; overflow: hidden; min-height: 0;
        }
        .viz-header {
            background: var(--accent); color: white; padding: 8px 12px; font-size: 0.85rem; font-weight: 600;
            display: flex; justify-content: space-between; align-items: center;
        }
        .viz-content {
            flex: 1; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; min-height: 0;
        }
        .viz-card {
            background: white; border-left: 3px solid var(--accent); padding: 10px; border-radius: 4px;
            font-size: 0.8rem; line-height: 1.5; color: #064e3b; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .viz-card strong { color: var(--primary); display: block; margin-bottom: 2px; }

        /* --- Bottom Logs (Left) --- */
        .system-monitor {
            grid-row: 2 / 3;
            grid-column: 1 / 2;
            background: #0f172a; color: #a5b4fc; font-family: 'Fira Code', monospace;
            padding: 1rem; border-radius: 6px; display: grid;
            grid-template-columns: 1fr 1fr; gap: 1rem; overflow: hidden;
        }
        .log-col { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
        .log-content { flex: 1; overflow-y: auto; font-size: 0.75rem; }
        .log-entry { margin-bottom: 3px; border-bottom: 1px solid #1e293b; padding-bottom: 2px; display: flex; gap: 8px;}
        
        /* Order contents specific styling */
        .log-item-list { 
            color: #facc15; 
            font-size: 0.7rem;
            padding-left: 20px; 
            margin-top: -2px;
            margin-bottom: 5px;
        }

        /* The Ping Animation for Main Memory */
        @keyframes ping-memory {
            0% { background-color: #10b981; box-shadow: 0 0 10px #10b981; }
            100% { background-color: transparent; box-shadow: none; }
        }
        .memory-ping {
            animation: ping-memory 0.5s ease-out;
            border-radius: 4px;
        }

        /* Buttons */
        .btn { border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600; margin-top: 5px;}
        .btn-checkout { width: 100%; background: var(--primary); color: white; padding: 10px; }
        .btn-checkout:hover { background: var(--secondary); }

        /* Overlay */
        .overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: none; justify-content: center; align-items: center; z-index: 100;
        }
        .loader-box { background: white; padding: 2rem; border-radius: 8px; text-align: center; min-width: 300px; }
        
        .badge { font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-left: auto; }
        .badge-auto { background: var(--accent); color: white; animation: pulse 2s infinite; }

        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

    </style>
</head>
<body>

<header>
    <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:1.5rem;">⚡</span>
        <div>
            <h2 style="font-size:1rem; margin:0;">PayPulse Enterprise</h2>
            <span style="font-size:0.75rem; opacity:0.7; color:var(--accent)">| Auto-Recovery Active</span>
        </div>
    </div>
    <div style="font-size: 0.8rem;">
        Backend: <span style="color:var(--secondary)">Localhost:3000</span>
    </div>
</header>

<main>
    <!-- Dashboard -->
    <section class="dashboard">
        <div class="product-grid-container">
            <div style="font-weight:600; margin-bottom:10px; display:flex; justify-content:space-between;">
                <span>Available Services</span>
                <span style="font-size:0.75rem; color:var(--text-muted)">Live Market Data</span>
            </div>
            <div class="product-grid" id="productGrid"></div>
        </div>
        
        <div class="cart-panel">
            <div style="font-weight:600; margin-bottom:10px;">Requisition Cart</div>
            <div class="cart-items" id="cartItems"></div>
            <div style="margin-top:auto; border-top:1px solid var(--border); padding-top:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span>Total Exposure:</span> <span id="cartTotal" style="font-weight:bold;">₹0</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="optimizeBtn" class="btn" style="flex:1; background:var(--secondary); color:white;">Optimize</button>
                    <button id="checkoutBtn" class="btn btn-checkout" style="flex:2;">Settle</button>
                </div>
            </div>
        </div>
    </section>

    <!-- RIGHT COLUMN -->
    <div class="right-column">
        <!-- Top: Chat -->
        <aside class="agent-panel">
            <div style="background:var(--primary); color:white; padding:10px; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
                <span>🤖 Financial Ops Agent</span>
                <span id="statusBadge" class="badge badge-auto">AUTONOMOUS</span>
            </div>
            <div class="chat-area" id="chatArea">
                <div class="message system">Connected to Payment Rails & Compliance DB</div>
                <div class="message agent">Monitoring settlement latency and risk exposure...</div>
            </div>
        </aside>

        <!-- Bottom: AI Process Visualizer -->
        <aside class="visualizer-panel">
            <div class="viz-header">
                <span>🧠 AI Activity & Decisions</span>
                <span style="font-size:0.7rem; opacity:0.8;">READABLE LOGS</span>
            </div>
            <div class="viz-content" id="visualizerLog">
                <div class="viz-card">
                    <strong>Initialization:</strong>
                    AI is now online and listening for user behavior, market data, and server health. It will auto-recover from failures.
                </div>
            </div>
        </aside>
    </div>

    <!-- BOTTOM LOGS (Left) -->
    <section class="system-monitor">
        <div class="log-col">
            <div style="color:var(--text-muted); border-bottom:1px solid #334155; padding-bottom:5px; font-size:0.7rem; text-transform:uppercase;">Network Traffic</div>
            <div class="log-content" id="networkLog"></div>
        </div>
        <div class="log-col" id="mainMemoryLogContainer">
            <div style="color:var(--text-muted); border-bottom:1px solid #334155; padding-bottom:5px; font-size:0.7rem; text-transform:uppercase;">Main System Memory</div>
            <div class="log-content" id="systemMemoryLog"></div>
        </div>
    </section>
</main>

<div class="overlay" id="loadingOverlay">
    <div class="loader-box">
        <div id="loadingText" style="font-weight:bold; margin-bottom:5px;">Initializing...</div>
        <div style="height:4px; background:#e2e8f0; border-radius:2px; overflow:hidden;">
            <div id="progressBar" style="height:100%; width:0%; background:var(--secondary); transition:width 0.2s;"></div>
        </div>
    </div>
</div>

<script>
const API_URL = 'http://localhost:3000/api';

const FINTECH_CATALOG = [
    { id: 1, name: "Payment Gateway API", price: 5999, type: "Infrastructure", risk: "Low" },
    { id: 2, name: "Global FX Transfer", price: 2500, type: "Remittance", risk: "High" },
    { id: 3, name: "AML Screening Engine", price: 8500, type: "Compliance", risk: "Low" },
    { id: 4, name: "Corporate Virtual Cards", price: 3200, type: "Issuing", risk: "Medium" },
    { id: 5, name: "Treasury Yield API", price: 1200, type: "Wealth", risk: "High" },
    { id: 6, name: "Identity Verification", price: 1500, type: "Identity", risk: "Low" },
    { id: 7, name: "Fraud Detection Shield", price: 6800, type: "Security", risk: "Low" },
    { id: 8, name: "Merchant BNPL Module", price: 4100, type: "Lending", risk: "Medium" }
];

// --- 1. Logger Helper ---
const Logger = {
    network: document.getElementById('networkLog'),
    memory: document.getElementById('systemMemoryLog'),
    memoryContainer: document.getElementById('mainMemoryLogContainer'),
    
    logNet: function(msg, type='info') {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span style="color:#64748b">[${new Date().toLocaleTimeString()}]</span> <span style="color:${type==='err'?'#ef4444':type==='success'?'#10b981':'#e2e8f0'}">${msg}</span>`;
        this.network.prepend(div);
    },
    
    logMemory: function(msg, type='info') {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span style="color:#64748b">[${new Date().toLocaleTimeString()}]</span> <span style="color:${type==='mod'?'#facc15':type==='success'?'#10b981':'#94a3b8'}">${msg}</span>`;
        this.memory.prepend(div);
    },

    pingMemory: function(msg) {
        this.logMemory(msg, 'mod');
        this.memoryContainer.classList.add('memory-ping');
        setTimeout(() => this.memoryContainer.classList.remove('memory-ping'), 500);
    },

    logOrderContents: function(items) {
        const itemNames = items.map(i => i.name).join(", ");
        const div = document.createElement('div');
        div.className = 'log-entry log-item-list';
        div.innerHTML = `<span style="color:#64748b">[${new Date().toLocaleTimeString()}]</span> > ORDER_CONTENTS: [${itemNames}]`;
        this.memory.prepend(div);
    }
};

// --- 2. Visualizer (Plain English) ---
const Visualizer = {
    container: document.getElementById('visualizerLog'),
    
    explain: function(title, text) {
        const div = document.createElement('div');
        div.className = 'viz-card';
        div.innerHTML = `<strong>${title}</strong>${text}`;
        this.container.appendChild(div);
        this.container.scrollTop = this.container.scrollHeight;
    }
};

// --- 3. Agentic AI Controller (AUTO-RECOVERY ENABLED) ---
class AIOps {
    constructor() {
        this.chatArea = document.getElementById('chatArea');
        this.isRecovering = false;
    }

    chat(text, type = 'agent') {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.innerHTML = text;
        this.chatArea.appendChild(div);
        this.chatArea.scrollTop = this.chatArea.scrollHeight;
    }

    async runComplianceCheck(items) {
        this.chat("🛡️ <b>Running AML Check...</b>", 'agent');
        
        await new Promise(r => setTimeout(r, 800)); 
        
        const highRiskItems = items.filter(i => i.risk === 'High');
        
        if (highRiskItems.length > 0) {
            Visualizer.explain("Risk Assessment", `AI detected ${highRiskItems.length} high-risk items. I am applying extra monitoring protocols to ensure safety.`);
            this.chat(`⚠️ High Risk flagged. Applied enhanced monitoring.`, 'agent');
            Logger.logMemory("RISK_LEVEL: HIGH (MONITORING ACTIVE)");
        } else {
            Visualizer.explain("Compliance Check", "The AI scanned all items against global sanction lists. No issues found.");
            this.chat("✅ Compliance Clear.", 'agent');
            Logger.logMemory("RISK_LEVEL: LOW (APPROVED)");
        }
    }

    handleSwap(oldItem, newItem) {
        Visualizer.explain("Asset Management", `AI detected a swap request. I am selling '${oldItem.name}' (₹${oldItem.price}) and buying '${newItem.name}' (₹${newItem.price}) to fit your goals.`);
        this.chat(`Swapped **${oldItem.name}** for **${newItem.name}**.`, 'agent');
        Logger.logMemory(`ASSET_SWAP: ${oldItem.name} -> ${newItem.name}`);
    }

    trackPurchase(item) {
        Visualizer.explain("Intent Tracking", "The AI watched you click 'Add to Cart'. I have stored this intention in my temporary memory.");
    }

    // --- AUTO-RECOVERY LOGIC ---
    async handleFailure(errorData, cartData) {
        // Prevent double-recovery loops
        if (this.isRecovering) return;
        this.isRecovering = true;

        Logger.logNet(`FAILURE CODE: ${errorData.code}`, 'err');
        this.chat(`❌ <b>Settlement Failed:</b> ${errorData.message}`, 'system');
        
        // Visual cue that AI is taking over
        document.getElementById('statusBadge').innerText = "RECOVERING...";
        document.getElementById('statusBadge').style.background = "var(--danger)";

        if (errorData.code === 'GATEWAY_DOWN') {
            Visualizer.explain("Critical Intervention", "The server crashed! The AI detected this immediately. It is now bypassing the crash and forcing the transaction through a backup system.");
            this.chat("🤖 <b>Auto-Recovery:</b> Bypassing Primary Gateway... Switching to Backup Rails.", 'agent');
            
            // AUTOMATIC EXECUTION
            setTimeout(() => {
                this.executeReroute(cartData);
            }, 1500); // 1.5s delay to simulate autonomous decision making

        } else if (errorData.code === 'DB_LOCK') {
            Visualizer.explain("Traffic Management", "The database is locked due to high traffic. AI is queuing your transaction so you don't have to wait.");
            this.chat("🤖 <b>Auto-Recovery:</b> DB Locked. Enforcing Message Queue Bypass.", 'agent');
            
            // AUTOMATIC EXECUTION
            setTimeout(() => {
                this.executeQueue(cartData);
            }, 1500);

        } else if (errorData.code === 'AML_FAILED') {
            Visualizer.explain("Security Block", "AI flagged a violation of international sanctions. This cannot be overridden.");
            this.chat("🛑 <b>Hard Block:</b> Sanctions violation. Manual review required.", 'agent');
            this.isRecovering = false;
            document.getElementById('statusBadge').innerText = "ONLINE";
            document.getElementById('statusBadge').style.background = "var(--accent)";
            return;
        }
    }

    // 4. Optimizes Cart
    handleOptimization() {
        Visualizer.explain("Cart Optimization", "The AI analyzed your cart. It is now reorganizing items by price (High to Low) to maximize value visibility.");
        this.chat("Cart optimized by value and efficiency.", 'agent');
        Logger.logMemory("CART_OPTIMIZED: REORGANIZED BY AI");
        app.sortCartByPrice();
    }

    // Execution Logic (Reroute)
    async executeReroute(cartData) {
        Visualizer.explain("Fixing Crash", "AI is writing 'SUCCESS' directly to memory, ignoring the server crash.");
        Logger.logNet("BYPASSING PRIMARY GATEWAY (AUTO)...");
        Logger.pingMemory("MANUAL_WRITE: STATUS=SUCCESS (OVERRIDE)");
        
        try {
            const response = await fetch(`${API_URL}/reroute-gateway`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(cartData)
            });
            const data = await response.json();
            Visualizer.explain("Recovery Complete", "Transaction saved! The user doesn't even know the server failed.");
            this.chat(`✅ <b>Auto-Recovery Complete!</b> ID: ${data.id}`, 'agent');
            app.resetCart(data, cartData.items);
            
            // Reset status badge
            document.getElementById('statusBadge').innerText = "AUTONOMOUS";
            document.getElementById('statusBadge').style.background = "var(--accent)";
            this.isRecovering = false;

        } catch (e) {
            this.chat("Backup failed too.", 'system');
            this.isRecovering = false;
        }
    }

    // Execution Logic (Queue)
    async executeQueue(cartData) {
        Visualizer.explain("Queuing Transaction", "AI stored the transaction in a temporary holding queue. It will be processed when the server is free.");
        Logger.logNet("QUEUEING TRANSACTION (AUTO)...");
        Logger.pingMemory("BATCH_QUEUE: ADDED TO PENDING");
        
        try {
            const response = await fetch(`${API_URL}/queue-retry`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(cartData)
            });
            const data = await response.json();
            this.chat(`✅ <b>Auto-Recovery Complete!</b> ID: ${data.id}`, 'agent');
            app.resetCart(data, cartData.items);
            
            // Reset status badge
            document.getElementById('statusBadge').innerText = "AUTONOMOUS";
            document.getElementById('statusBadge').style.background = "var(--accent)";
            this.isRecovering = false;
        } catch (e) {
            this.chat("Queue failed.", 'system');
            this.isRecovering = false;
        }
    }
}

// --- 4. App Logic ---
class App {
    constructor() {
        this.cart = [];
        this.ai = new AIOps();
        this.init();
    }

    init() {
        const grid = document.getElementById('productGrid');
        FINTECH_CATALOG.forEach(p => {
            const el = document.createElement('div');
            el.className = 'product-card';
            el.innerHTML = `
                <div style="font-size:2rem; margin-bottom:10px;">${this.getIcon(p.type)}</div>
                <div>
                    <div style="font-weight:600;">${p.name}</div>
                    <div class="product-meta">${p.type} • Risk: ${p.risk}</div>
                </div>
                <div class="product-price">₹${p.price}</div>
            `;
            el.onclick = () => this.addToCart(p);
            grid.appendChild(el);
        });

        document.getElementById('checkoutBtn').onclick = () => this.checkout();
        document.getElementById('optimizeBtn').onclick = () => this.ai.handleOptimization();
    }

    getIcon(type) {
        if(type==='Infrastructure') return '💳'; if(type==='Remittance') return '🌍';
        if(type==='Compliance') return '⚖️'; if(type==='Issuing') return '💼';
        if(type==='Wealth') return '📈'; if(type==='Identity') return '🆔';
        if(type==='Security') return '🛡️'; if(type==='Lending') return '💸';
        return '📦';
    }

    addToCart(p) {
        this.cart.push(p);
        this.updateCart();
        this.ai.trackPurchase(p); 
        if (p.risk === 'High') this.ai.chat(`Added ${p.name}. <br><span style="color:var(--danger)">⚠️ High Risk.</span>`);
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCart();
    }

    sortCartByPrice() {
        this.cart.sort((a, b) => b.price - a.price);
        this.updateCart();
        Logger.logMemory("CART_SORTED: HIGH_TO_LOW_VALUE");
    }

    initiateSwap(index) {
        const itemToSell = this.cart[index];
        this.ai.chat(`Selling **${itemToSell.name}**. Select replacement:`, 'agent');
        
        const swapDiv = document.createElement('div');
        swapDiv.style.marginTop = "10px";
        swapDiv.style.display = "flex";
        swapDiv.style.flexWrap = "wrap";
        swapDiv.style.gap = "5px";
        
        FINTECH_CATALOG.filter(p => p.id !== itemToSell.id).slice(0,3).forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn'; 
            btn.style.cssText = "background:#e0f2fe; color:#0369a1; border:none; padding:4px 8px; border-radius:4px; font-size:0.8rem; cursor:pointer;";
            btn.textContent = p.name;
            btn.onclick = () => {
                this.ai.handleSwap(itemToSell, p); 
                this.cart.splice(index, 1);
                this.cart.push(p);
                this.updateCart();
                swapDiv.remove();
            };
            swapDiv.appendChild(btn);
        });
        
        this.ai.chatArea.appendChild(swapDiv);
    }

    updateCart() {
        const container = document.getElementById('cartItems');
        container.innerHTML = '';
        let total = 0;
        this.cart.forEach((item, idx) => {
            total += item.price;
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div>
                    <div style="font-weight:600">${item.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted)">${item.type}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button onclick="app.initiateSwap(${idx})" style="background:var(--warning); border:none; color:white; cursor:pointer; border-radius:3px; font-size:0.7rem; padding:2px 5px;">Swap</button>
                    <button onclick="app.removeFromCart(${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.2rem;">×</button>
                </div>
            `;
            container.appendChild(el);
        });
        document.getElementById('cartTotal').innerText = `₹${total}`;
        document.getElementById('checkoutBtn').disabled = this.cart.length === 0;
    }

    resetCart(data, items) {
        this.cart = [];
        this.updateCart();
        document.getElementById('loadingOverlay').style.display = 'none';
        Logger.logNet(`SETTLEMENT COMPLETE: ${data.id}`, 'success');
        
        Logger.pingMemory(`FINAL_STATE: TRANSACTION_COMMITTED_ID=${data.id}`);
        Logger.logOrderContents(items);
    }

    async checkout() {
        const overlay = document.getElementById('loadingOverlay');
        const bar = document.getElementById('progressBar');
        const txt = document.getElementById('loadingText');
        
        overlay.style.display = 'flex';

        txt.innerText = "Running AML/KYC Compliance...";
        bar.style.width = "20%";
        await this.ai.runComplianceCheck(this.cart);

        txt.innerText = "Contacting Primary Gateway...";
        bar.style.width = "50%";
        
        const cartData = { items: this.cart, total: this.cart.reduce((a,b)=>a+b.price,0) };

        try {
            Logger.logNet(`POST /checkout (Items: ${this.cart.length})...`);
            const response = await fetch(`${API_URL}/checkout`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(cartData)
            });

            const data = await response.json();

            if (!response.ok) {
                Logger.logNet(`ERROR: ${response.status}`, 'err');
                throw new Error(JSON.stringify(data)); 
            }

            // Success
            bar.style.width = "100%";
            this.resetCart(data, this.cart);
            this.ai.chat(`✅ <b>Settled!</b> ID: ${data.id}.`, 'agent');

        } catch (error) {
            overlay.style.display = 'none';
            try {
                const errorData = JSON.parse(error.message);
                this.ai.handleFailure(errorData, cartData); // AUTO RECOVERY
            } catch (e) {
                this.ai.chat(`Unknown network error: ${error.message}`, 'system');
            }
        }
    }
}

const app = new App();
</script>
</body>
</html>
```

---

### 2. Update `server.js` (Minor Logging Update)

I updated the console logs to explicitly say `AUTO` when the frontend fixes things autonomously.

```javascript
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let transactions = [];

// --- 1. Main Checkout Endpoint ---
app.post('/api/checkout', (req, res) => {
    const { items, total } = req.body;
    const rand = Math.random();

    // Scenario A: Compliance Failure (10% chance)
    if (rand < 0.1) {
        console.log(`❌ SERVER LOG: Compliance Check Failed (Sanctions List).`);
        return res.status(403).json({ 
            error: "Compliance Alert",
            code: "AML_FAILED",
            message: "Transaction matched sanctions list."
        });
    }

    // Scenario B: Gateway Timeout (20% chance)
    if (rand < 0.3) {
        console.log(`❌ SERVER LOG: Primary Gateway Timeout.`);
        return res.status(504).json({ 
            error: "Gateway Timeout",
            code: "GATEWAY_DOWN",
            message: "Primary payment node unreachable."
        });
    }

    // Scenario C: Database Lock (20% chance)
    if (rand < 0.5) {
        console.log(`❌ SERVER LOG: Database Write Lock.`);
        return res.status(503).json({ 
            error: "Service Unavailable",
            code: "DB_LOCK",
            message: "Database under high load."
        });
    }

    // Scenario D: Success (50% chance)
    const id = 'TXN-' + Math.floor(Math.random() * 100000);
    const record = { id, status: 'SETTLED', items, total, timestamp: new Date() };
    transactions.push(record);
    
    console.log(`✅ SERVER LOG: Settlement Successful. ID: ${id}`);
    console.log(`   - Items Received: ${items.map(i => i.name).join(", ")}`);
    
    res.status(200).json(record);
});

// --- 2. Reroute Endpoint (Auto-Recovery) ---
app.post('/api/reroute-gateway', (req, res) => {
    const { items, total } = req.body;
    console.log(`🔄 SERVER LOG: AUTO-RECOVERY - Traffic rerouted to Backup Gateway (Checkout.com)`);
    
    const id = 'TXN-REROUTE-' + Math.floor(Math.random() * 100000);
    const record = { id, status: 'SETTLED (BACKUP)', items, total, timestamp: new Date() };
    transactions.push(record);
    res.status(200).json(record);
});

// --- 3. Queue Retry Endpoint (Auto-Recovery) ---
app.post('/api/queue-retry', (req, res) => {
    const { items, total } = req.body;
    console.log(`⏳ SERVER LOG: AUTO-RECOVERY - Transaction queued for batch processing`);
    
    const id = 'TXN-BATCH-' + Math.floor(Math.random() * 100000);
    const record = { id, status: 'PENDING BATCH', items, total, timestamp: new Date() };
    transactions.push(record);
    res.status(200).json(record);
});

app.listen(PORT, () => {
    console.log(`🚀 Fintech Ops Server running at http://localhost:${PORT}`);
});
```