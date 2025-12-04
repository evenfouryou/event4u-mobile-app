document.addEventListener('DOMContentLoaded', async () => {
  const readerStatus = document.getElementById('reader-status');
  const readerName = document.getElementById('reader-name');
  const cardStatus = document.getElementById('card-status');
  const cardType = document.getElementById('card-type');
  const emissionStatus = document.getElementById('emission-status');
  const emissionIcon = document.getElementById('emission-icon');
  const emissionText = document.getElementById('emission-text');
  const wsPort = document.getElementById('ws-port');
  const clientsCount = document.getElementById('clients-count');
  const demoBanner = document.getElementById('demo-banner');
  const btnDemo = document.getElementById('btn-demo');
  const btnRefresh = document.getElementById('btn-refresh');

  let isDemo = false;

  function updateStatus(status) {
    // Modalita demo
    isDemo = status.simulationMode;
    if (isDemo) {
      demoBanner.style.display = 'flex';
      btnDemo.textContent = 'Disattiva Demo';
      btnDemo.classList.remove('btn-primary');
      btnDemo.classList.add('btn-warning');
    } else {
      demoBanner.style.display = 'none';
      btnDemo.textContent = 'Attiva Demo';
      btnDemo.classList.remove('btn-warning');
      btnDemo.classList.add('btn-primary');
    }

    // Stato lettore
    if (status.readerDetected || status.readerConnected) {
      readerStatus.className = 'status connected';
      readerStatus.querySelector('.text').textContent = 'Connesso';
      readerName.textContent = status.readerName || 'MiniLector EVO V3';
    } else {
      readerStatus.className = 'status disconnected';
      readerStatus.querySelector('.text').textContent = 'Non rilevato';
      readerName.textContent = '-';
    }

    // Stato carta
    if (status.cardInserted) {
      cardStatus.className = 'status connected';
      cardStatus.querySelector('.text').textContent = 'Inserita';
      cardType.textContent = status.cardType || 'Smart Card SIAE';
    } else {
      cardStatus.className = 'status disconnected';
      cardStatus.querySelector('.text').textContent = 'Non inserita';
      cardType.textContent = '-';
    }

    // Stato emissione
    const canEmit = (status.readerDetected || status.readerConnected) && status.cardInserted;
    if (canEmit) {
      emissionStatus.className = 'emission-status ready';
      emissionIcon.innerHTML = '&#10004;';
      if (isDemo) {
        emissionText.textContent = 'Pronto per emissione (DEMO)';
      } else {
        emissionText.textContent = 'Pronto per emissione biglietti SIAE';
      }
    } else {
      emissionStatus.className = 'emission-status';
      emissionIcon.innerHTML = '&#10060;';
      if (!(status.readerDetected || status.readerConnected)) {
        emissionText.textContent = 'Collegare il lettore Smart Card';
      } else if (!status.cardInserted) {
        emissionText.textContent = 'Inserire la Smart Card SIAE';
      } else {
        emissionText.textContent = 'Non pronto per emissione';
      }
    }

    // Info connessione
    if (status.wsPort) {
      wsPort.textContent = status.wsPort;
    }

    if (status.clientsConnected !== undefined) {
      clientsCount.textContent = status.clientsConnected;
    }
  }

  // Carica stato iniziale
  try {
    const initialStatus = await window.electronAPI.getStatus();
    updateStatus(initialStatus);
  } catch (e) {
    console.error('Errore caricamento stato:', e);
  }

  // Ascolta aggiornamenti
  window.electronAPI.onUpdateStatus((status) => {
    updateStatus(status);
  });

  // Pulsante Demo
  btnDemo.addEventListener('click', async () => {
    btnDemo.disabled = true;
    try {
      if (isDemo) {
        await window.electronAPI.disableDemo();
      } else {
        await window.electronAPI.enableDemo();
      }
    } catch (e) {
      console.error('Errore toggle demo:', e);
    }
    btnDemo.disabled = false;
  });

  // Pulsante Aggiorna
  btnRefresh.addEventListener('click', async () => {
    btnRefresh.disabled = true;
    btnRefresh.textContent = 'Aggiornamento...';
    try {
      const status = await window.electronAPI.refreshStatus();
      updateStatus(status);
    } catch (e) {
      console.error('Errore refresh:', e);
    }
    btnRefresh.textContent = 'Aggiorna Stato';
    btnRefresh.disabled = false;
  });
});
