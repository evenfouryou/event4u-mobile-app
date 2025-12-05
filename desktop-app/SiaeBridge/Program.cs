using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;

namespace EventFourYouSiaeLettore
{
    static class Program
    {
        private const int WS_PORT = 18766;
        private static TcpListener _tcpListener;
        private static readonly List<TcpClient> _clients = new List<TcpClient>();
        private static NotifyIcon _trayIcon;
        private static bool _isInitialized = false;
        private static string _readerName = null;
        private static bool _cardPresent = false;
        private static string _cardSerial = null;
        private static string _lastError = null;
        private static bool _demoMode = false;
        private static bool _serverRunning = false;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            CreateTrayIcon();
            Task.Run(() => StartTcpServer());
            Task.Run(() => InitializeSiae());
            Task.Run(() => PollCardStatus());

            Application.Run();
        }

        static void CreateTrayIcon()
        {
            _trayIcon = new NotifyIcon();
            _trayIcon.Icon = System.Drawing.SystemIcons.Application;
            _trayIcon.Text = "Event Four You SIAE Bridge";
            _trayIcon.Visible = true;

            var menu = new ContextMenuStrip();
            menu.Items.Add("Stato: In attesa...", null, null);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Attiva Demo", null, (s, e) => EnableDemoMode());
            menu.Items.Add("Disattiva Demo", null, (s, e) => DisableDemoMode());
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Esci", null, (s, e) => ExitApplication());

            _trayIcon.ContextMenuStrip = menu;
            _trayIcon.DoubleClick += (s, e) => ShowStatus();
        }

        static void UpdateTrayStatus()
        {
            if (_trayIcon?.ContextMenuStrip == null) return;

            string status;
            if (_demoMode)
            {
                status = "Stato: DEMO MODE";
                _trayIcon.Icon = System.Drawing.SystemIcons.Warning;
            }
            else if (!_serverRunning)
            {
                status = "Stato: Server non avviato";
                _trayIcon.Icon = System.Drawing.SystemIcons.Error;
            }
            else if (!_isInitialized)
            {
                status = "Stato: libSIAE non inizializzata";
                _trayIcon.Icon = System.Drawing.SystemIcons.Information;
            }
            else if (!_cardPresent)
            {
                status = "Stato: Smart card non inserita";
                _trayIcon.Icon = System.Drawing.SystemIcons.Error;
            }
            else
            {
                status = $"Stato: Pronto ({_cardSerial})";
                _trayIcon.Icon = System.Drawing.SystemIcons.Shield;
            }

            _trayIcon.ContextMenuStrip.Items[0].Text = status;
            _trayIcon.Text = "SIAE Bridge\n" + status;
        }

        static void ShowStatus()
        {
            var msg = $"Event Four You SIAE Bridge\n\n" +
                      $"Server: {(_serverRunning ? "Attivo" : "Non attivo")} (porta {WS_PORT})\n" +
                      $"Libreria: {(LibSiae.IsLibraryAvailable() ? "OK" : "Non trovata")}\n" +
                      $"Inizializzato: {(_isInitialized ? "Si" : "No")}\n" +
                      $"Lettore: {_readerName ?? "N/A"}\n" +
                      $"Smart Card: {(_cardPresent ? "Inserita" : "Non inserita")}\n" +
                      $"Seriale: {_cardSerial ?? "N/A"}\n" +
                      $"Demo Mode: {(_demoMode ? "Attivo" : "Disattivo")}\n" +
                      $"Client connessi: {_clients.Count}\n" +
                      $"Ultimo errore: {_lastError ?? "Nessuno"}";
            
            MessageBox.Show(msg, "SIAE Bridge Status", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        static void EnableDemoMode()
        {
            _demoMode = true;
            _cardPresent = true;
            _cardSerial = "DEMO-12345678";
            _readerName = "MiniLector EVO V3 (DEMO)";
            _isInitialized = true;
            UpdateTrayStatus();
            BroadcastStatus();
            _trayIcon.ShowBalloonTip(3000, "Demo Mode", "Modalita demo attivata", ToolTipIcon.Warning);
        }

        static void DisableDemoMode()
        {
            _demoMode = false;
            _cardPresent = false;
            _cardSerial = null;
            UpdateTrayStatus();
            BroadcastStatus();
            _trayIcon.ShowBalloonTip(3000, "Demo Mode", "Modalita demo disattivata", ToolTipIcon.Info);
        }

        static void ExitApplication()
        {
            try
            {
                if (_isInitialized && !_demoMode)
                {
                    LibSiae.Finalize();
                }
            }
            catch { }

            _trayIcon.Visible = false;
            _tcpListener?.Stop();
            Application.Exit();
        }

        static void InitializeSiae()
        {
            try
            {
                if (!LibSiae.IsLibraryAvailable())
                {
                    _lastError = "libSIAE.dll non trovata";
                    UpdateTrayStatus();
                    return;
                }

                int result = LibSiae.Initialize();
                if (result == LibSiae.SIAE_OK)
                {
                    _isInitialized = true;
                    _readerName = "MiniLector EVO V3";
                    _lastError = null;
                    _trayIcon.ShowBalloonTip(3000, "SIAE Bridge", "Lettore inizializzato", ToolTipIcon.Info);
                }
                else
                {
                    _lastError = LibSiae.GetErrorMessage(result);
                }
                UpdateTrayStatus();
            }
            catch (Exception ex)
            {
                _lastError = ex.Message;
                UpdateTrayStatus();
            }
        }

        static async Task PollCardStatus()
        {
            while (true)
            {
                try
                {
                    if (_demoMode)
                    {
                        await Task.Delay(2000);
                        continue;
                    }

                    if (_isInitialized)
                    {
                        int cardIn = LibSiae.isCardIn();
                        bool wasPresent = _cardPresent;
                        _cardPresent = cardIn == 1;

                        if (_cardPresent && !wasPresent)
                        {
                            ReadCardSerial();
                            _trayIcon.ShowBalloonTip(2000, "Smart Card", "Carta SIAE inserita", ToolTipIcon.Info);
                        }
                        else if (!_cardPresent && wasPresent)
                        {
                            _cardSerial = null;
                            _trayIcon.ShowBalloonTip(2000, "Smart Card", "Carta SIAE rimossa", ToolTipIcon.Warning);
                        }

                        UpdateTrayStatus();
                        BroadcastStatus();
                    }
                }
                catch (Exception ex)
                {
                    _lastError = ex.Message;
                }

                await Task.Delay(1500);
            }
        }

        static void ReadCardSerial()
        {
            try
            {
                byte[] sn = new byte[64];
                int snLen = sn.Length;
                int result = LibSiae.GetSN(sn, ref snLen);
                if (result == LibSiae.SIAE_OK && snLen > 0)
                {
                    _cardSerial = Encoding.ASCII.GetString(sn, 0, snLen).TrimEnd('\0');
                }
            }
            catch { }
        }

        static async Task StartTcpServer()
        {
            try
            {
                _tcpListener = new TcpListener(IPAddress.Loopback, WS_PORT);
                _tcpListener.Start();
                _serverRunning = true;
                Console.WriteLine($"SIAE Bridge WebSocket server su ws://127.0.0.1:{WS_PORT}");
                UpdateTrayStatus();

                while (true)
                {
                    var client = await _tcpListener.AcceptTcpClientAsync();
                    _ = Task.Run(() => HandleClient(client));
                }
            }
            catch (Exception ex)
            {
                _lastError = $"Server error: {ex.Message}";
                _serverRunning = false;
                UpdateTrayStatus();
            }
        }

        static async Task HandleClient(TcpClient client)
        {
            NetworkStream stream = null;
            try
            {
                stream = client.GetStream();
                
                // WebSocket handshake
                byte[] buffer = new byte[4096];
                int bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length);
                string request = Encoding.UTF8.GetString(buffer, 0, bytesRead);

                if (!request.Contains("Upgrade: websocket"))
                {
                    // HTTP health check
                    if (request.Contains("GET /health") || request.Contains("GET / "))
                    {
                        string json = GetStatusJsonRaw();
                        string response = "HTTP/1.1 200 OK\r\n" +
                                         "Content-Type: application/json\r\n" +
                                         "Access-Control-Allow-Origin: *\r\n" +
                                         $"Content-Length: {Encoding.UTF8.GetByteCount(json)}\r\n" +
                                         "\r\n" + json;
                        byte[] responseBytes = Encoding.UTF8.GetBytes(response);
                        await stream.WriteAsync(responseBytes, 0, responseBytes.Length);
                    }
                    client.Close();
                    return;
                }

                // Perform WebSocket handshake
                string swk = Regex.Match(request, "Sec-WebSocket-Key: (.*)").Groups[1].Value.Trim();
                string swka = swk + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
                byte[] swkaSha1 = SHA1.Create().ComputeHash(Encoding.UTF8.GetBytes(swka));
                string swkaSha1Base64 = Convert.ToBase64String(swkaSha1);

                string handshake = "HTTP/1.1 101 Switching Protocols\r\n" +
                                  "Connection: Upgrade\r\n" +
                                  "Upgrade: websocket\r\n" +
                                  $"Sec-WebSocket-Accept: {swkaSha1Base64}\r\n\r\n";

                byte[] handshakeBytes = Encoding.UTF8.GetBytes(handshake);
                await stream.WriteAsync(handshakeBytes, 0, handshakeBytes.Length);

                lock (_clients) { _clients.Add(client); }

                // Send initial status
                await SendWebSocketMessage(stream, GetStatusJsonRaw());

                // Read messages
                while (client.Connected)
                {
                    if (!stream.DataAvailable)
                    {
                        await Task.Delay(50);
                        continue;
                    }

                    string message = await ReadWebSocketMessage(stream);
                    if (message == null) break;

                    string response = ProcessCommand(message);
                    await SendWebSocketMessage(stream, response);
                }
            }
            catch { }
            finally
            {
                lock (_clients) { _clients.Remove(client); }
                try { client?.Close(); } catch { }
            }
        }

        static async Task<string> ReadWebSocketMessage(NetworkStream stream)
        {
            try
            {
                byte[] header = new byte[2];
                int read = await stream.ReadAsync(header, 0, 2);
                if (read < 2) return null;

                bool fin = (header[0] & 0x80) != 0;
                int opcode = header[0] & 0x0F;
                
                if (opcode == 8) return null; // Close frame

                bool masked = (header[1] & 0x80) != 0;
                int len = header[1] & 0x7F;

                if (len == 126)
                {
                    byte[] lenBytes = new byte[2];
                    await stream.ReadAsync(lenBytes, 0, 2);
                    len = (lenBytes[0] << 8) | lenBytes[1];
                }
                else if (len == 127)
                {
                    byte[] lenBytes = new byte[8];
                    await stream.ReadAsync(lenBytes, 0, 8);
                    len = (int)BitConverter.ToInt64(lenBytes, 0);
                }

                byte[] mask = new byte[4];
                if (masked)
                {
                    await stream.ReadAsync(mask, 0, 4);
                }

                byte[] payload = new byte[len];
                int totalRead = 0;
                while (totalRead < len)
                {
                    int r = await stream.ReadAsync(payload, totalRead, len - totalRead);
                    if (r == 0) return null;
                    totalRead += r;
                }

                if (masked)
                {
                    for (int i = 0; i < payload.Length; i++)
                    {
                        payload[i] ^= mask[i % 4];
                    }
                }

                return Encoding.UTF8.GetString(payload);
            }
            catch
            {
                return null;
            }
        }

        static async Task SendWebSocketMessage(NetworkStream stream, string message)
        {
            try
            {
                byte[] payload = Encoding.UTF8.GetBytes(message);
                byte[] frame;

                if (payload.Length < 126)
                {
                    frame = new byte[2 + payload.Length];
                    frame[0] = 0x81; // FIN + Text
                    frame[1] = (byte)payload.Length;
                    Array.Copy(payload, 0, frame, 2, payload.Length);
                }
                else if (payload.Length < 65536)
                {
                    frame = new byte[4 + payload.Length];
                    frame[0] = 0x81;
                    frame[1] = 126;
                    frame[2] = (byte)(payload.Length >> 8);
                    frame[3] = (byte)(payload.Length & 0xFF);
                    Array.Copy(payload, 0, frame, 4, payload.Length);
                }
                else
                {
                    frame = new byte[10 + payload.Length];
                    frame[0] = 0x81;
                    frame[1] = 127;
                    long len = payload.Length;
                    for (int i = 0; i < 8; i++)
                    {
                        frame[9 - i] = (byte)(len & 0xFF);
                        len >>= 8;
                    }
                    Array.Copy(payload, 0, frame, 10, payload.Length);
                }

                await stream.WriteAsync(frame, 0, frame.Length);
            }
            catch { }
        }

        static string ProcessCommand(string messageJson)
        {
            try
            {
                var msg = JsonConvert.DeserializeObject<CommandMessage>(messageJson);
                
                switch (msg.type?.ToLower())
                {
                    case "getstatus":
                    case "get_status":
                    case "status":
                        return GetStatusJsonRaw();

                    case "ping":
                        return JsonConvert.SerializeObject(new { type = "pong", timestamp = DateTime.UtcNow });

                    case "enabledemo":
                        EnableDemoMode();
                        return GetStatusJsonRaw();

                    case "disabledemo":
                        DisableDemoMode();
                        return GetStatusJsonRaw();

                    case "verifypin":
                        return VerifyPin(msg.data);

                    case "computesigillo":
                    case "requestseal":
                        return ComputeSigillo(msg.data);

                    case "sign":
                        return SignData(msg.data);

                    case "getcertificate":
                        return GetCertificate();

                    case "getserial":
                        return GetSerial();

                    default:
                        return JsonConvert.SerializeObject(new { type = "error", message = $"Comando sconosciuto: {msg.type}" });
                }
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "error", message = ex.Message });
            }
        }

        static string GetStatusJsonRaw()
        {
            return JsonConvert.SerializeObject(new
            {
                type = "status",
                data = new
                {
                    connected = true,
                    initialized = _isInitialized || _demoMode,
                    readerDetected = _isInitialized || _demoMode,
                    readerConnected = _isInitialized || _demoMode,
                    readerName = _readerName,
                    cardInserted = _cardPresent,
                    cardSerial = _cardSerial,
                    canEmitTickets = _cardPresent || _demoMode,
                    bridgeConnected = true,
                    demoMode = _demoMode,
                    simulationMode = _demoMode,
                    lastError = _lastError,
                    timestamp = DateTime.UtcNow.ToString("o"),
                    clientsConnected = _clients.Count
                }
            });
        }

        static string VerifyPin(dynamic data)
        {
            try
            {
                if (_demoMode)
                {
                    return JsonConvert.SerializeObject(new { type = "pinResponse", success = true, message = "PIN verificato (DEMO)" });
                }

                string pin = data?.pin?.ToString();
                if (string.IsNullOrEmpty(pin))
                {
                    return JsonConvert.SerializeObject(new { type = "pinResponse", success = false, message = "PIN non fornito" });
                }

                int result = LibSiae.VerifyPIN(1, pin, pin.Length);
                bool success = result == LibSiae.SIAE_OK;
                
                return JsonConvert.SerializeObject(new 
                { 
                    type = "pinResponse", 
                    success = success, 
                    message = success ? "PIN verificato" : LibSiae.GetErrorMessage(result)
                });
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "pinResponse", success = false, message = ex.Message });
            }
        }

        static string ComputeSigillo(dynamic data)
        {
            try
            {
                if (_demoMode)
                {
                    var demoSeal = $"DEMO{DateTime.Now:yyyyMMddHHmmss}{new Random().Next(1000, 9999)}";
                    return JsonConvert.SerializeObject(new 
                    { 
                        type = "sealResponse", 
                        success = true, 
                        seal = new 
                        { 
                            sealCode = demoSeal,
                            timestamp = DateTime.UtcNow.ToString("o"),
                            demoMode = true
                        }
                    });
                }

                if (!_cardPresent)
                {
                    return JsonConvert.SerializeObject(new { type = "sealResponse", success = false, message = "Smart card non inserita" });
                }

                string ticketData = data?.ticketData?.ToString() ?? DateTime.Now.ToString("yyyyMMddHHmmss");
                byte[] dataBytes = Encoding.UTF8.GetBytes(ticketData);
                byte[] sigillo = new byte[64];
                int sigilloLen = sigillo.Length;

                int result = LibSiae.ComputeSigillo(dataBytes, dataBytes.Length, sigillo, ref sigilloLen);
                
                if (result == LibSiae.SIAE_OK)
                {
                    string sealCode = BitConverter.ToString(sigillo, 0, sigilloLen).Replace("-", "");
                    return JsonConvert.SerializeObject(new 
                    { 
                        type = "sealResponse", 
                        success = true, 
                        seal = new 
                        { 
                            sealCode = sealCode,
                            timestamp = DateTime.UtcNow.ToString("o"),
                            cardSerial = _cardSerial
                        }
                    });
                }
                else
                {
                    return JsonConvert.SerializeObject(new { type = "sealResponse", success = false, message = LibSiae.GetErrorMessage(result) });
                }
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "sealResponse", success = false, message = ex.Message });
            }
        }

        static string SignData(dynamic data)
        {
            try
            {
                if (_demoMode)
                {
                    return JsonConvert.SerializeObject(new { type = "signResponse", success = true, signature = "DEMO_SIGNATURE_" + Guid.NewGuid().ToString("N").Substring(0, 16) });
                }

                if (!_cardPresent)
                {
                    return JsonConvert.SerializeObject(new { type = "signResponse", success = false, message = "Smart card non inserita" });
                }

                string dataToSign = data?.content?.ToString() ?? "";
                byte[] dataBytes = Encoding.UTF8.GetBytes(dataToSign);
                byte[] signature = new byte[512];
                int signatureLen = signature.Length;

                int result = LibSiae.Sign(dataBytes, dataBytes.Length, signature, ref signatureLen);
                
                if (result == LibSiae.SIAE_OK)
                {
                    string signatureHex = Convert.ToBase64String(signature, 0, signatureLen);
                    return JsonConvert.SerializeObject(new { type = "signResponse", success = true, signature = signatureHex });
                }
                else
                {
                    return JsonConvert.SerializeObject(new { type = "signResponse", success = false, message = LibSiae.GetErrorMessage(result) });
                }
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "signResponse", success = false, message = ex.Message });
            }
        }

        static string GetCertificate()
        {
            try
            {
                if (_demoMode)
                {
                    return JsonConvert.SerializeObject(new { type = "certificateResponse", success = true, certificate = "DEMO_CERTIFICATE" });
                }

                if (!_cardPresent)
                {
                    return JsonConvert.SerializeObject(new { type = "certificateResponse", success = false, message = "Smart card non inserita" });
                }

                byte[] cert = new byte[4096];
                int certLen = cert.Length;

                int result = LibSiae.GetSIAECertificate(cert, ref certLen);
                
                if (result == LibSiae.SIAE_OK)
                {
                    string certBase64 = Convert.ToBase64String(cert, 0, certLen);
                    return JsonConvert.SerializeObject(new { type = "certificateResponse", success = true, certificate = certBase64 });
                }
                else
                {
                    return JsonConvert.SerializeObject(new { type = "certificateResponse", success = false, message = LibSiae.GetErrorMessage(result) });
                }
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "certificateResponse", success = false, message = ex.Message });
            }
        }

        static string GetSerial()
        {
            try
            {
                if (_demoMode)
                {
                    return JsonConvert.SerializeObject(new { type = "serialResponse", success = true, serial = "DEMO-12345678" });
                }

                return JsonConvert.SerializeObject(new { type = "serialResponse", success = _cardSerial != null, serial = _cardSerial });
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "serialResponse", success = false, message = ex.Message });
            }
        }

        static async void BroadcastStatus()
        {
            var statusJson = GetStatusJsonRaw();
            List<TcpClient> clientsCopy;
            
            lock (_clients)
            {
                clientsCopy = new List<TcpClient>(_clients);
            }

            foreach (var client in clientsCopy)
            {
                try
                {
                    if (client.Connected)
                    {
                        await SendWebSocketMessage(client.GetStream(), statusJson);
                    }
                }
                catch { }
            }
        }

        class CommandMessage
        {
            public string type { get; set; }
            public dynamic data { get; set; }
        }
    }
}
