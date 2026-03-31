// Plague Knight: Vector — Web3 Bridge
// Player wallet calls: claimDailyKey, buyKeys (player pays/signs)
// API calls: startRun, submitScore (server signs with governor key)

(function() {
  const CHAIN_ID = 1946;
  const CHAIN_HEX = "0x79A";
  const RPC_URL = "https://rpc.minato.soneium.org";
  const CHAIN_NAME = "Soneium Minato";

  const PLAGUE_KEYS = "0xc359b0a6622aD6520Ee5A47a2dea496A929B7C57";
  const PLAGUE_JACKPOT = "0xcDDB693CEA9424DA5024aCE130c7DFcDAB929941";

  // API URL — set to your Railway deployment
  const API_URL = window.PLAGUE_API_URL || "http://localhost:3000";

  const KEYS_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function freeKeys(address) view returns (uint256)",
    "function totalKeys(address) view returns (uint256)",
    "function claimDailyKey()",
    "function buyKeys(uint256) payable",
    "function lastDailyClaim(address) view returns (uint256)",
    "function keyPrice() view returns (uint256)",
  ];

  let ethersLib = null;
  let provider = null;
  let signer = null;
  let keysContract = null;
  let connectedAddress = null;

  // Load ethers eagerly
  import("https://esm.sh/ethers@6.13.4").then(mod => {
    ethersLib = mod.ethers || mod;
    console.log("[PlagueWeb3] ethers loaded");
  }).catch(e => console.error("[PlagueWeb3] Failed to load ethers:", e));

  function ensureChain() {
    if (!window.ethereum) return Promise.reject(new Error("No wallet"));
    return window.ethereum.request({ method: "eth_chainId" }).then(function(chainId) {
      if (chainId === CHAIN_HEX) return;
      return window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_HEX }],
      }).catch(function(e) {
        if (e.code === 4902) {
          return window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: CHAIN_HEX,
              chainName: CHAIN_NAME,
              rpcUrls: [RPC_URL],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            }],
          });
        }
        throw e;
      });
    });
  }

  // --- Helper: API call ---
  function apiCall(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    return fetch(API_URL + "/api" + path, opts).then(r => r.json());
  }

  window.PlagueWeb3 = {

    // --- Wallet connect (browser-side) ---
    connectWallet: function(godotCallback) {
      console.log("[PlagueWeb3] connectWallet called");
      if (!window.ethereum) { godotCallback(JSON.stringify({ error: "No wallet found" })); return; }
      if (!ethersLib) { godotCallback(JSON.stringify({ error: "ethers loading, try again" })); return; }

      ensureChain().then(function() {
        provider = new ethersLib.BrowserProvider(window.ethereum);
        return provider.getSigner();
      }).then(function(s) {
        signer = s;
        return signer.getAddress();
      }).then(function(addr) {
        connectedAddress = addr;
        keysContract = new ethersLib.Contract(PLAGUE_KEYS, KEYS_ABI, signer);
        console.log("[PlagueWeb3] connected:", addr);
        godotCallback(JSON.stringify({ address: addr }));
      }).catch(function(e) {
        console.error("[PlagueWeb3] connect error:", e);
        godotCallback(JSON.stringify({ error: e.message }));
      });
    },

    // --- Reads (direct RPC, free) ---
    getKeyBalance: function(godotCallback) {
      if (!keysContract || !connectedAddress) { godotCallback("0"); return; }
      keysContract.totalKeys(connectedAddress).then(function(bal) {
        godotCallback(bal.toString());
      }).catch(function() { godotCallback("0"); });
    },

    getFreeKeys: function(godotCallback) {
      if (!keysContract || !connectedAddress) { godotCallback("0"); return; }
      keysContract.freeKeys(connectedAddress).then(function(bal) {
        godotCallback(bal.toString());
      }).catch(function() { godotCallback("0"); });
    },

    getPaidKeys: function(godotCallback) {
      if (!keysContract || !connectedAddress) { godotCallback("0"); return; }
      keysContract.balanceOf(connectedAddress).then(function(bal) {
        godotCallback(bal.toString());
      }).catch(function() { godotCallback("0"); });
    },

    getKeyPrice: function(godotCallback) {
      if (!keysContract) { godotCallback("0"); return; }
      keysContract.keyPrice().then(function(p) {
        godotCallback(p.toString());
      }).catch(function() { godotCallback("0"); });
    },

    canClaimDaily: function(godotCallback) {
      if (!keysContract || !connectedAddress) { godotCallback("false"); return; }
      keysContract.lastDailyClaim(connectedAddress).then(function(lastClaim) {
        var today = Math.floor(Date.now() / 1000 / 86400);
        godotCallback((Number(lastClaim) < today).toString());
      }).catch(function() { godotCallback("false"); });
    },

    // --- Player wallet signs (claimDaily, buyKeys) ---
    claimDailyKey: function(godotCallback) {
      if (!keysContract) { godotCallback(JSON.stringify({ error: "Not connected" })); return; }
      keysContract.claimDailyKey().then(function(tx) {
        return tx.wait();
      }).then(function(receipt) {
        godotCallback(JSON.stringify({ success: true, hash: receipt.hash }));
      }).catch(function(e) {
        godotCallback(JSON.stringify({ error: e.message }));
      });
    },

    buyKeys: function(amount, godotCallback) {
      if (!keysContract) { godotCallback(JSON.stringify({ error: "Not connected" })); return; }
      keysContract.keyPrice().then(function(price) {
        var totalCost = price * BigInt(amount);
        return keysContract.buyKeys(amount, { value: totalCost });
      }).then(function(tx) {
        return tx.wait();
      }).then(function(receipt) {
        godotCallback(JSON.stringify({ success: true, hash: receipt.hash }));
      }).catch(function(e) {
        godotCallback(JSON.stringify({ error: e.message }));
      });
    },

    // --- API calls (server signs with governor key) ---
    startRun: function(godotCallback) {
      if (!connectedAddress) { godotCallback(JSON.stringify({ error: "Not connected" })); return; }
      apiCall("POST", "/run/start", { player: connectedAddress }).then(function(data) {
        godotCallback(JSON.stringify(data));
      }).catch(function(e) {
        godotCallback(JSON.stringify({ error: e.message }));
      });
    },

    submitScore: function(score, town, moves, hash, runId, godotCallback) {
      if (!connectedAddress) { godotCallback(JSON.stringify({ error: "Not connected" })); return; }
      apiCall("POST", "/run/end", {
        runId: runId,
        player: connectedAddress,
        score: score,
        town: town,
        moves: moves,
        hash: hash,
      }).then(function(data) {
        godotCallback(JSON.stringify(data));
      }).catch(function(e) {
        godotCallback(JSON.stringify({ error: e.message }));
      });
    },

    // --- Leaderboard (via API, cached) ---
    getLeaderboard: function(godotCallback) {
      apiCall("GET", "/leaderboard").then(function(data) {
        godotCallback(JSON.stringify(data));
      }).catch(function() {
        godotCallback("{}");
      });
    },

    // --- Player stats (via API) ---
    getPlayerStats: function(godotCallback) {
      if (!connectedAddress) { godotCallback("{}"); return; }
      apiCall("GET", "/player/" + connectedAddress).then(function(data) {
        godotCallback(JSON.stringify(data));
      }).catch(function() {
        godotCallback("{}");
      });
    },
  };

  console.log("[PlagueWeb3] bridge loaded");
})();
