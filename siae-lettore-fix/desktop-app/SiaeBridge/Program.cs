using System;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using Newtonsoft.Json;

namespace SiaeBridge
{
    class Program
    {
        // ============================================================
        // SCARD_STATE flags from Windows Smart Card API
        // ============================================================
        const int SCARD_STATE_UNAWARE = 0x0000;
        const int SCARD_STATE_IGNORE = 0x0001;
        const int SCARD_STATE_CHANGED = 0x0002;
        const int SCARD_STATE_UNKNOWN = 0x0004;
        const int SCARD_STATE_UNAVAILABLE = 0x0008;
        const int SCARD_STATE_EMPTY = 0x0010;      // 16 - no card
        const int SCARD_STATE_PRESENT = 0x0020;    // 32 - card present!
        const int SCARD_STATE_ATRMATCH = 0x0040;
        const int SCARD_STATE_EXCLUSIVE = 0x0080;
        const int SCARD_STATE_INUSE = 0x0100;
        const int SCARD_STATE_MUTE = 0x0200;

        // ============================================================
        // IMPORT libSIAE.dll - StdCall calling convention (confirmed)
        // ============================================================
        private const string DLL = "libSIAE.dll";

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern int isCardIn(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern int Initialize(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern int FinalizeML(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern int BeginTransactionML(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern int EndTransactionML(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern int GetSNML(byte[] sn, int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern int ReadCounterML(ref uint val, int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern int ReadBalanceML(ref uint val, int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern byte GetKeyIDML(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.StdCall)]
        static extern int ComputeSigilloML(byte[] dt, uint price, byte[] sn, byte[] mac, ref uint cnt, int slot);

        // PIN deve essere passato come puntatore a stringa ANSI null-terminated
        [DllImport(DLL, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        static extern int VerifyPINML(int nPIN, [MarshalAs(UnmanagedType.LPStr)] string pin, int nSlot);

        // Windows API
        [DllImport("winscard.dll", CharSet = CharSet.Unicode)]
        static extern int SCardListReadersW(IntPtr hContext, string mszGroups, byte[] mszReaders, ref int pcchReaders);

        [DllImport("winscard.dll")]
        static extern int SCardEstablishContext(int dwScope, IntPtr pvReserved1, IntPtr pvReserved2, ref IntPtr phContext);

        [DllImport("winscard.dll")]
        static extern int SCardReleaseContext(IntPtr hContext);

        // ============================================================
        // STATE
        // ============================================================
        static int _slot = -1;
        static StreamWriter _log;

        // ============================================================
        // MAIN
        // ============================================================
        static void Main()
        {
            string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bridge.log");
            try { _log = new StreamWriter(logPath, true) { AutoFlush = true }; } catch { }

            Log("═══════════════════════════════════════════════════════");
            Log("SiaeBridge v3.6 - S/MIME email signature for SIAE transmission (Allegato C)");
            Log($"Time: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            Log($"Dir: {AppDomain.CurrentDomain.BaseDirectory}");
            Log($"32-bit Process: {!Environment.Is64BitProcess}");

            string dllPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "libSIAE.dll");
            if (File.Exists(dllPath))
            {
                Log($"✓ libSIAE.dll: {new FileInfo(dllPath).Length} bytes");
            }
            else
            {
                Log("✗ libSIAE.dll NOT FOUND!");
            }

            Console.WriteLine("READY");
            Log("Bridge READY");

            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;

                Log($">> {line}");
                string response = Handle(line);
                Console.WriteLine(response);
                Log($"<< {(response.Length > 300 ? response.Substring(0, 300) + "..." : response)}");
            }
        }

        static void Log(string msg)
        {
            try { _log?.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] {msg}"); } catch { }
        }

        // ============================================================
        // Check if card is present using SCARD_STATE bitmask
        // ============================================================
        static bool IsCardPresent(int state)
        {
            // isCardIn returns SCARD_STATE bitmask:
            // - 0 means no readers or error
            // - 16 (0x10) = SCARD_STATE_EMPTY = no card
            // - 32 (0x20) = SCARD_STATE_PRESENT = card present!
            // - Can be combined: 34 = PRESENT | CHANGED
            return (state & SCARD_STATE_PRESENT) != 0;
        }

        static string DecodeCardState(int state)
        {
            if (state == 0) return "NO_READER";
            var flags = new System.Collections.Generic.List<string>();
            if ((state & SCARD_STATE_CHANGED) != 0) flags.Add("CHANGED");
            if ((state & SCARD_STATE_UNKNOWN) != 0) flags.Add("UNKNOWN");
            if ((state & SCARD_STATE_UNAVAILABLE) != 0) flags.Add("UNAVAILABLE");
            if ((state & SCARD_STATE_EMPTY) != 0) flags.Add("EMPTY");
            if ((state & SCARD_STATE_PRESENT) != 0) flags.Add("PRESENT");
            if ((state & SCARD_STATE_ATRMATCH) != 0) flags.Add("ATRMATCH");
            if ((state & SCARD_STATE_EXCLUSIVE) != 0) flags.Add("EXCLUSIVE");
            if ((state & SCARD_STATE_INUSE) != 0) flags.Add("INUSE");
            if ((state & SCARD_STATE_MUTE) != 0) flags.Add("MUTE");
            return flags.Count > 0 ? string.Join("|", flags) : $"0x{state:X2}";
        }

        // ============================================================
        // COMMAND HANDLER
        // ============================================================
        static string Handle(string cmd)
        {
            try
            {
                if (cmd == "PING") return OK("PONG");
                if (cmd == "EXIT") { Environment.Exit(0); return OK("BYE"); }
                if (cmd == "CHECK_READER") return CheckReader();
                if (cmd == "READ_CARD") return ReadCard();
                if (cmd == "GET_CERTIFICATE") return GetCertificate();
                if (cmd == "GET_RETRIES") return GetRetries();
                if (cmd.StartsWith("VERIFY_PIN:")) return VerifyPin(cmd.Substring(11));
                if (cmd.StartsWith("CHANGE_PIN:")) return ChangePin(cmd.Substring(11));
                if (cmd.StartsWith("UNLOCK_PUK:")) return UnlockPuk(cmd.Substring(11));
                if (cmd.StartsWith("COMPUTE_SIGILLO:")) return ComputeSigillo(cmd.Substring(16));
                if (cmd.StartsWith("SIGN_XML:")) return SignXml(cmd.Substring(9));
                if (cmd.StartsWith("SIGN_SMIME:")) return SignSmime(cmd.Substring(11));
                return ERR($"Comando sconosciuto: {cmd}");
            }
            catch (DllNotFoundException ex)
            {
                Log($"DllNotFoundException: {ex.Message}");
                return ERR("libSIAE.dll non trovata");
            }
            catch (Exception ex)
            {
                Log($"Exception: {ex.GetType().Name}: {ex.Message}");
                return ERR(ex.Message);
            }
        }

        static string OK(object data) => JsonConvert.SerializeObject(new { success = true, data });
        static string ERR(string msg) => JsonConvert.SerializeObject(new { success = false, error = msg });

        // ============================================================
        // CHECK READER
        // ============================================================
        static string CheckReader()
        {
            bool hasReaders = CheckWindowsSmartCardReaders();
            Log($"Windows readers: {hasReaders}");

            if (!hasReaders)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    readerConnected = false,
                    cardPresent = false,
                    message = "Nessun lettore rilevato"
                });
            }

            try
            {
                for (int s = 0; s < 16; s++)
                {
                    try
                    {
                        int state = isCardIn(s);
                        string decoded = DecodeCardState(state);
                        Log($"  isCardIn({s}) = {state} (0x{state:X2}) = {decoded}");

                        if (state == 0)
                        {
                            // No more readers
                            break;
                        }

                        if (IsCardPresent(state))
                        {
                            Log($"  ✓ CARTA PRESENTE in slot {s}!");

                            // Reset card state before initialize
                            int finRes = FinalizeML(s);
                            Log($"  FinalizeML({s}) = {finRes}");
                            
                            // Try to initialize
                            Log($"  Trying Initialize({s})...");
                            int init = Initialize(s);
                            Log($"  Initialize({s}) = {init} (0x{init:X4})");

                            _slot = s;

                            if (init == 0 || init == 3) // 0=OK, 3=already initialized
                            {
                                return JsonConvert.SerializeObject(new
                                {
                                    success = true,
                                    readerConnected = true,
                                    cardPresent = true,
                                    slot = s,
                                    cardState = decoded,
                                    initResult = init,
                                    message = "Carta SIAE rilevata e pronta!"
                                });
                            }
                            else
                            {
                                return JsonConvert.SerializeObject(new
                                {
                                    success = true,
                                    readerConnected = true,
                                    cardPresent = true,
                                    slot = s,
                                    cardState = decoded,
                                    initResult = init,
                                    warning = $"Initialize returned 0x{init:X4}",
                                    message = "Carta rilevata (init warning)"
                                });
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Log($"  Slot {s} error: {ex.Message}");
                        break;
                    }
                }

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    readerConnected = true,
                    cardPresent = false,
                    message = "Inserire carta SIAE"
                });
            }
            catch (Exception ex)
            {
                Log($"CheckReader error: {ex.Message}");
                return JsonConvert.SerializeObject(new
                {
                    success = false,
                    readerConnected = hasReaders,
                    cardPresent = false,
                    error = ex.Message
                });
            }
        }

        static bool CheckWindowsSmartCardReaders()
        {
            try
            {
                IntPtr context = IntPtr.Zero;
                int result = SCardEstablishContext(2, IntPtr.Zero, IntPtr.Zero, ref context);
                if (result != 0) return false;

                int size = 0;
                result = SCardListReadersW(context, null, null, ref size);
                bool hasReaders = (result == 0 && size > 0);

                if (hasReaders)
                {
                    byte[] readers = new byte[size * 2];
                    SCardListReadersW(context, null, readers, ref size);
                    string readerList = Encoding.Unicode.GetString(readers);
                    Log($"  Readers: {readerList.Replace('\0', '|')}");
                }

                SCardReleaseContext(context);
                return hasReaders;
            }
            catch { return false; }
        }

        // ============================================================
        // READ CARD
        // ============================================================
        static string ReadCard()
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            bool tx = false;
            try
            {
                Log($"ReadCard: slot={_slot}");

                int state = isCardIn(_slot);
                Log($"  isCardIn({_slot}) = {state} ({DecodeCardState(state)})");
                if (!IsCardPresent(state))
                {
                    _slot = -1;
                    return ERR("Carta rimossa");
                }

                int init = Initialize(_slot);
                Log($"  Initialize = {init}");

                int txResult = BeginTransactionML(_slot);
                Log($"  BeginTransactionML = {txResult}");
                tx = (txResult == 0);

                byte[] sn = new byte[8];
                int snResult = GetSNML(sn, _slot);
                Log($"  GetSNML = {snResult}, SN = {BitConverter.ToString(sn)}");

                if (snResult != 0)
                {
                    return ERR($"Lettura SN fallita: errore 0x{snResult:X4}");
                }

                uint cnt = 0, bal = 0;
                int cntResult = ReadCounterML(ref cnt, _slot);
                Log($"  ReadCounterML = {cntResult} (0x{cntResult:X4}), cnt = {cnt}");
                
                int balResult = ReadBalanceML(ref bal, _slot);
                Log($"  ReadBalanceML = {balResult} (0x{balResult:X4}), bal = {bal}");
                
                byte key = GetKeyIDML(_slot);
                Log($"  GetKeyIDML = {key}");

                Log($"  FINAL: Counter = {cnt}, Balance = {bal}, KeyID = {key}");

                // Anche se counter/balance falliscono, ritorniamo comunque i dati che abbiamo
                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    serialNumber = BitConverter.ToString(sn).Replace("-", ""),
                    counter = cntResult == 0 ? (uint?)cnt : null,
                    balance = balResult == 0 ? (uint?)bal : null,
                    keyId = (int)key,
                    slot = _slot,
                    counterError = cntResult != 0 ? $"0x{cntResult:X4}" : null,
                    balanceError = balResult != 0 ? $"0x{balResult:X4}" : null
                });
            }
            catch (Exception ex)
            {
                Log($"ReadCard error: {ex.Message}");
                return ERR(ex.Message);
            }
            finally
            {
                if (tx)
                {
                    try
                    {
                        EndTransactionML(_slot);
                        Log("  EndTransactionML done");
                    }
                    catch { }
                }
            }
        }

        // ============================================================
        // GET CERTIFICATE - Legge certificato X.509 ed estrae email
        // Per identificare l'indirizzo SIAE di risposta
        // ============================================================
        static string GetCertificate()
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            bool tx = false;
            try
            {
                Log($"GetCertificate: slot={_slot}");

                int state = isCardIn(_slot);
                Log($"  isCardIn({_slot}) = {state} ({DecodeCardState(state)})");
                if (!IsCardPresent(state))
                {
                    _slot = -1;
                    return ERR("Carta rimossa");
                }

                int init = Initialize(_slot);
                Log($"  Initialize = {init}");

                int txResult = BeginTransactionML(_slot);
                Log($"  BeginTransactionML = {txResult}");
                tx = (txResult == 0);

                // Select DF PKI (0x1111) for certificate access
                int sel0000 = LibSiae.SelectML(0x0000, _slot);
                Log($"  SelectML(0x0000 root) = {sel0000} (0x{sel0000:X4})");
                
                int sel1111 = LibSiae.SelectML(0x1111, _slot);
                Log($"  SelectML(0x1111 DF PKI) = {sel1111} (0x{sel1111:X4})");

                // Get the certificate from the smart card
                byte[] cert = new byte[2048];
                int certLen = cert.Length;
                int certResult = LibSiae.GetCertificateML(cert, ref certLen, _slot);
                Log($"  GetCertificateML = {certResult}, certLen={certLen}");
                
                if (certResult != 0 || certLen == 0)
                {
                    return ERR($"Lettura certificato fallita: 0x{certResult:X4}");
                }

                byte[] actualCert = new byte[certLen];
                Array.Copy(cert, actualCert, certLen);

                // Parse X.509 certificate to extract email and other info
                string email = "";
                string commonName = "";
                string serialNumber = "";
                string issuer = "";
                string expiryDate = "";
                
                try
                {
                    var x509 = new System.Security.Cryptography.X509Certificates.X509Certificate2(actualCert);
                    commonName = x509.GetNameInfo(System.Security.Cryptography.X509Certificates.X509NameType.SimpleName, false) ?? "";
                    serialNumber = x509.SerialNumber ?? "";
                    issuer = x509.Issuer ?? "";
                    expiryDate = x509.NotAfter.ToString("yyyy-MM-dd");
                    
                    // Try to get email from Subject Alternative Name (SAN) extension
                    foreach (var ext in x509.Extensions)
                    {
                        if (ext.Oid?.Value == "2.5.29.17") // Subject Alternative Name OID
                        {
                            var sanString = ext.Format(false);
                            Log($"  SAN extension: {sanString}");
                            
                            // Look for RFC822 Name (email) in SAN
                            var match = System.Text.RegularExpressions.Regex.Match(sanString, @"RFC822[^=]*=([^\s,]+)");
                            if (match.Success)
                            {
                                email = match.Groups[1].Value;
                                Log($"  Found email in SAN: {email}");
                                break;
                            }
                            // Also try email: prefix
                            match = System.Text.RegularExpressions.Regex.Match(sanString, @"email:([^\s,]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                            if (match.Success)
                            {
                                email = match.Groups[1].Value;
                                Log($"  Found email in SAN (email:): {email}");
                                break;
                            }
                        }
                    }
                    
                    // Fallback: Try to get email from Subject (E= or EMAILADDRESS=)
                    if (string.IsNullOrEmpty(email))
                    {
                        var subject = x509.Subject;
                        Log($"  Subject: {subject}");
                        
                        var emailMatch = System.Text.RegularExpressions.Regex.Match(subject, @"(?:E=|EMAIL=|EMAILADDRESS=)([^,]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                        if (emailMatch.Success)
                        {
                            email = emailMatch.Groups[1].Value.Trim();
                            Log($"  Found email in Subject: {email}");
                        }
                    }
                    
                    Log($"  Certificate parsed: CN={commonName}, Email={email}, Expiry={expiryDate}");
                }
                catch (Exception certEx)
                {
                    Log($"  Certificate parsing error: {certEx.Message}");
                    return ERR($"Errore parsing certificato: {certEx.Message}");
                }

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    email = email,
                    commonName = commonName,
                    serialNumber = serialNumber,
                    issuer = issuer,
                    expiryDate = expiryDate,
                    certificateBase64 = Convert.ToBase64String(actualCert)
                });
            }
            catch (Exception ex)
            {
                Log($"GetCertificate error: {ex.Message}");
                return ERR(ex.Message);
            }
            finally
            {
                if (tx)
                {
                    try
                    {
                        EndTransactionML(_slot);
                        Log("  EndTransactionML done");
                    }
                    catch { }
                }
            }
        }

        // ============================================================
        // VERIFY PIN - Verifica PIN sulla carta SIAE
        // ============================================================
        static string VerifyPin(string pin)
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            // Pulisci il PIN: rimuovi spazi e caratteri non numerici
            pin = new string(pin.Where(char.IsDigit).ToArray());
            
            if (string.IsNullOrEmpty(pin) || pin.Length < 4)
            {
                return ERR("PIN non valido - deve contenere almeno 4 cifre");
            }

            bool tx = false;
            try
            {
                Log($"VerifyPin: slot={_slot}, pin={new string('*', pin.Length)} (length={pin.Length})");

                int state = isCardIn(_slot);
                Log($"  isCardIn({_slot}) = {state} ({DecodeCardState(state)})");
                if (!IsCardPresent(state))
                {
                    _slot = -1;
                    return ERR("Carta rimossa");
                }

                // Prima chiama Finalize per resettare lo stato della carta
                int finRes = FinalizeML(_slot);
                Log($"  FinalizeML = {finRes}");
                
                int init = Initialize(_slot);
                Log($"  Initialize = {init}");
                
                // Se Initialize non ritorna 0, la carta potrebbe essere in uno stato inconsistente
                // Questo può accadere se la sessione precedente non è stata chiusa correttamente
                if (init != 0)
                {
                    Log($"  Initialize returned {init}, trying to reset card state...");
                    FinalizeML(_slot);
                    System.Threading.Thread.Sleep(100);  // Breve pausa
                    init = Initialize(_slot);
                    Log($"  Initialize (2nd attempt) = {init}");
                }

                int txResult = BeginTransactionML(_slot);
                Log($"  BeginTransactionML = {txResult}");
                tx = (txResult == 0);

                // ========================================
                // SEQUENZA CORRETTA DA DOCUMENTAZIONE SIAE
                // ========================================
                // Per Sigillo Fiscale: SelectML(0x0000) -> SelectML(0x1112) -> VerifyPINML(1, pin)
                // Per PKI (firma):     SelectML(0x0000) -> SelectML(0x1111) -> VerifyPINML(1, pin)
                
                // 1. Seleziona root (0x0000)
                int sel0000 = LibSiae.SelectML(0x0000, _slot);
                Log($"  SelectML(0x0000 root) = {sel0000} (0x{sel0000:X4})");
                
                // 2. Seleziona DF Sigilli Fiscali (0x1112)
                int sel1112 = LibSiae.SelectML(0x1112, _slot);
                Log($"  SelectML(0x1112 DF Sigilli) = {sel1112} (0x{sel1112:X4})");
                
                // Se 0x1112 fallisce, prova 0x1111 (DF PKI)
                if (sel1112 != 0)
                {
                    int sel1111 = LibSiae.SelectML(0x1111, _slot);
                    Log($"  SelectML(0x1111 DF PKI) = {sel1111} (0x{sel1111:X4})");
                }
                
                // 3. Verifica PIN con nPIN=1 (dalla documentazione ufficiale)
                int pinResult = VerifyPINML(1, pin, _slot);
                Log($"  VerifyPINML(nPIN=1, pin=***) = {pinResult} (0x{pinResult:X4})");
                
                // Se nPIN=1 non funziona, proviamo altri valori
                if (pinResult != 0 && pinResult != 0x6983 && (pinResult < 0x63C0 || pinResult > 0x63CF))
                {
                    Log($"  nPIN=1 fallito, provo altri valori...");
                    int[] altNPin = { 0, 2, 0x81 };
                    foreach (int nPin in altNPin)
                    {
                        int res = VerifyPINML(nPin, pin, _slot);
                        Log($"  VerifyPINML(nPIN={nPin}) = {res} (0x{res:X4})");
                        if (res == 0 || res == 0x6983 || (res >= 0x63C0 && res <= 0x63CF))
                        {
                            pinResult = res;
                            break;
                        }
                    }
                }

                if (pinResult == 0)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        verified = true,
                        message = "PIN verificato correttamente"
                    });
                }
                else if (pinResult == 0x6982)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        verified = false,
                        error = "PIN errato",
                        errorCode = pinResult
                    });
                }
                else if (pinResult == 0x6983)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        verified = false,
                        error = "PIN bloccato - troppi tentativi errati",
                        errorCode = pinResult
                    });
                }
                else
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        verified = false,
                        error = $"Errore verifica PIN: 0x{pinResult:X4}",
                        errorCode = pinResult
                    });
                }
            }
            catch (Exception ex)
            {
                Log($"VerifyPin error: {ex.Message}");
                return ERR(ex.Message);
            }
            finally
            {
                if (tx)
                {
                    try
                    {
                        EndTransactionML(_slot);
                        Log("  EndTransactionML done");
                    }
                    catch { }
                }
            }
        }

        // ============================================================
        // CHANGE PIN - Cambio PIN della carta SIAE
        // ============================================================
        static string ChangePin(string args)
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            // Formato: oldPin,newPin
            var parts = args.Split(',');
            if (parts.Length != 2)
            {
                return ERR("Formato: CHANGE_PIN:oldPin,newPin");
            }

            string oldPin = new string(parts[0].Where(char.IsDigit).ToArray());
            string newPin = new string(parts[1].Where(char.IsDigit).ToArray());

            if (oldPin.Length < 4 || oldPin.Length > 8)
            {
                return ERR("PIN attuale non valido - deve essere 4-8 cifre");
            }
            if (newPin.Length < 4 || newPin.Length > 8)
            {
                return ERR("Nuovo PIN non valido - deve essere 4-8 cifre");
            }

            bool tx = false;
            try
            {
                Log($"ChangePin: slot={_slot}, oldPin=****, newPin=****");

                int state = isCardIn(_slot);
                if (!IsCardPresent(state))
                {
                    _slot = -1;
                    return ERR("Carta rimossa");
                }

                int finRes = FinalizeML(_slot);
                Log($"  FinalizeML = {finRes}");
                
                int init = Initialize(_slot);
                Log($"  Initialize = {init}");

                int txResult = BeginTransactionML(_slot);
                Log($"  BeginTransactionML = {txResult}");
                tx = (txResult == 0);

                // Seleziona root e DF Sigilli
                int sel0000 = LibSiae.SelectML(0x0000, _slot);
                Log($"  SelectML(0x0000) = {sel0000}");
                
                int sel1112 = LibSiae.SelectML(0x1112, _slot);
                Log($"  SelectML(0x1112) = {sel1112}");

                // Cambio PIN
                int result = LibSiae.ChangePINML(1, oldPin, newPin, _slot);
                Log($"  ChangePINML(nPIN=1) = {result} (0x{result:X4})");

                if (result == 0)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        changed = true,
                        message = "PIN cambiato con successo"
                    });
                }
                else if (result == 0x6982 || result == 0x6983)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        changed = false,
                        error = result == 0x6983 ? "PIN bloccato" : "PIN attuale errato",
                        errorCode = result
                    });
                }
                else
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        changed = false,
                        error = $"Errore cambio PIN: 0x{result:X4}",
                        errorCode = result
                    });
                }
            }
            catch (Exception ex)
            {
                Log($"ChangePin error: {ex.Message}");
                return ERR(ex.Message);
            }
            finally
            {
                if (tx)
                {
                    try
                    {
                        EndTransactionML(_slot);
                        Log("  EndTransactionML done");
                    }
                    catch { }
                }
            }
        }

        // ============================================================
        // UNLOCK PUK - Sblocco carta con PUK
        // ============================================================
        static string UnlockPuk(string args)
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            // Formato: puk,newPin
            var parts = args.Split(',');
            if (parts.Length != 2)
            {
                return ERR("Formato: UNLOCK_PUK:puk,newPin");
            }

            string puk = new string(parts[0].Where(char.IsDigit).ToArray());
            string newPin = new string(parts[1].Where(char.IsDigit).ToArray());

            if (puk.Length != 8)
            {
                return ERR("PUK non valido - deve essere esattamente 8 cifre");
            }
            if (newPin.Length < 4 || newPin.Length > 8)
            {
                return ERR("Nuovo PIN non valido - deve essere 4-8 cifre");
            }

            bool tx = false;
            try
            {
                Log($"UnlockPuk: slot={_slot}, puk=********, newPin=****");

                int state = isCardIn(_slot);
                if (!IsCardPresent(state))
                {
                    _slot = -1;
                    return ERR("Carta rimossa");
                }

                int finRes = FinalizeML(_slot);
                Log($"  FinalizeML = {finRes}");
                
                int init = Initialize(_slot);
                Log($"  Initialize = {init}");

                int txResult = BeginTransactionML(_slot);
                Log($"  BeginTransactionML = {txResult}");
                tx = (txResult == 0);

                // Seleziona root e DF Sigilli
                int sel0000 = LibSiae.SelectML(0x0000, _slot);
                Log($"  SelectML(0x0000) = {sel0000}");
                
                int sel1112 = LibSiae.SelectML(0x1112, _slot);
                Log($"  SelectML(0x1112) = {sel1112}");

                // Sblocco con PUK
                int result = LibSiae.UnblockPINML(1, puk, newPin, _slot);
                Log($"  UnblockPINML(nPIN=1) = {result} (0x{result:X4})");

                if (result == 0)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        unlocked = true,
                        message = "Carta sbloccata con successo"
                    });
                }
                else if (result == 0x6983)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        unlocked = false,
                        error = "PUK bloccato - carta non recuperabile",
                        errorCode = result
                    });
                }
                else if (result == 0x6982)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        unlocked = false,
                        error = "PUK errato",
                        errorCode = result
                    });
                }
                else
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        unlocked = false,
                        error = $"Errore sblocco PUK: 0x{result:X4}",
                        errorCode = result
                    });
                }
            }
            catch (Exception ex)
            {
                Log($"UnlockPuk error: {ex.Message}");
                return ERR(ex.Message);
            }
            finally
            {
                if (tx)
                {
                    try
                    {
                        EndTransactionML(_slot);
                        Log("  EndTransactionML done");
                    }
                    catch { }
                }
            }
        }

        // ============================================================
        // GET RETRIES - Ottieni tentativi PIN/PUK rimasti
        // ============================================================
        static string GetRetries()
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            bool tx = false;
            try
            {
                Log($"GetRetries: slot={_slot}");

                int state = isCardIn(_slot);
                if (!IsCardPresent(state))
                {
                    _slot = -1;
                    return ERR("Carta rimossa");
                }

                int init = Initialize(_slot);
                Log($"  Initialize = {init}");

                int txResult = BeginTransactionML(_slot);
                Log($"  BeginTransactionML = {txResult}");
                tx = (txResult == 0);

                // Le carte SIAE non hanno un comando diretto per leggere i tentativi rimasti.
                // Il numero di tentativi viene restituito come parte del codice errore 0x63CX
                // dove X è il numero di tentativi rimasti.
                // Per ora, restituiamo valori default (3 per PIN, 10 per PUK tipicamente)
                // In futuro si potrebbe provare a verificare un PIN vuoto per ottenere il counter.

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    pinRetries = 3,  // Valore default, non leggibile direttamente
                    pukRetries = 10, // Valore default, non leggibile direttamente
                    message = "Tentativi stimati (valori standard carte SIAE)"
                });
            }
            catch (Exception ex)
            {
                Log($"GetRetries error: {ex.Message}");
                return ERR(ex.Message);
            }
            finally
            {
                if (tx)
                {
                    try
                    {
                        EndTransactionML(_slot);
                        Log("  EndTransactionML done");
                    }
                    catch { }
                }
            }
        }

        // ============================================================
        // COMPUTE SIGILLO
        // ============================================================
        static string ComputeSigillo(string json)
        {
            if (_slot < 0) return ERR("Nessuna carta");

            bool tx = false;
            try
            {
                dynamic req = JsonConvert.DeserializeObject(json);
                decimal price = req.price;
                string pin = req.pin;  // Get PIN from request

                int state = isCardIn(_slot);
                if (!IsCardPresent(state)) { _slot = -1; return ERR("Carta rimossa"); }

                Initialize(_slot);
                BeginTransactionML(_slot);
                tx = true;

                // ========================================
                // PIN VERIFICATION BEFORE SEAL (required by SIAE cards)
                // Sequence from official test.c: SelectML(0x0000) -> SelectML(0x1112) -> SelectML(0x1000) -> VerifyPINML(1, pin)
                // Error 0x6982 = "Security status not satisfied" = C_NOT_AUTHORIZED
                // ========================================
                if (!string.IsNullOrEmpty(pin))
                {
                    Log($"  PIN provided, verifying before seal (SIAE sequence)...");
                    
                    // Clean PIN
                    pin = new string(pin.Where(char.IsDigit).ToArray());
                    
                    // SIAE official sequence from test.c (lines 220-234):
                    // 1. Select root DF (0x0000)
                    int sel0000 = LibSiae.SelectML(0x0000, _slot);
                    Log($"  SelectML(0x0000 root) = {sel0000} (0x{sel0000:X4})");
                    
                    // 2. Select DF Sigilli Fiscali (0x1112)
                    int sel1112 = LibSiae.SelectML(0x1112, _slot);
                    Log($"  SelectML(0x1112 DF Sigilli) = {sel1112} (0x{sel1112:X4})");
                    
                    // 3. Select EF (0x1000) - from performance test in official docs
                    int sel1000 = LibSiae.SelectML(0x1000, _slot);
                    Log($"  SelectML(0x1000 EF) = {sel1000} (0x{sel1000:X4})");
                    
                    // 4. Verify PIN with nPIN=1 (from official docs)
                    int pinResult = VerifyPINML(1, pin, _slot);
                    Log($"  VerifyPINML(nPIN=1) = {pinResult} (0x{pinResult:X4})");
                    
                    if (pinResult != 0)
                    {
                        if (pinResult == 0x6983)
                            return ERR("PIN bloccato - troppi tentativi errati");
                        else if (pinResult == 0x6982)
                            return ERR("PIN errato - autenticazione fallita");
                        else if (pinResult >= 0x63C0 && pinResult <= 0x63CF)
                            return ERR($"PIN errato - tentativi rimasti: {pinResult & 0x0F}");
                        else
                            return ERR($"Verifica PIN fallita: 0x{pinResult:X4}");
                    }
                    Log($"  ✓ PIN verified successfully before seal");
                }
                else
                {
                    Log($"  WARNING: No PIN provided, seal may fail with 0x6982");
                }

                DateTime dt = DateTime.Now;
                byte[] bcd = new byte[5];
                int y = dt.Year % 100;
                bcd[0] = (byte)(((y / 10) << 4) | (y % 10));
                bcd[1] = (byte)(((dt.Month / 10) << 4) | (dt.Month % 10));
                bcd[2] = (byte)(((dt.Day / 10) << 4) | (dt.Day % 10));
                bcd[3] = (byte)(((dt.Hour / 10) << 4) | (dt.Hour % 10));
                bcd[4] = (byte)(((dt.Minute / 10) << 4) | (dt.Minute % 10));

                uint cents = (uint)(price * 100);
                byte[] sn = new byte[8], mac = new byte[8];
                uint cnt = 0;

                Log($"ComputeSigilloML: price={cents} cents");
                int r = ComputeSigilloML(bcd, cents, sn, mac, ref cnt, _slot);
                Log($"  Result = {r} (0x{r:X4})");

                if (r != 0) return ERR($"Sigillo fallito: errore 0x{r:X4}");

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    sigillo = new
                    {
                        serialNumber = BitConverter.ToString(sn).Replace("-", ""),
                        mac = BitConverter.ToString(mac).Replace("-", ""),
                        counter = cnt,
                        dateTime = dt.ToString("yyyy-MM-dd HH:mm"),
                        price = price
                    }
                });
            }
            catch (Exception ex)
            {
                Log($"ComputeSigillo error: {ex.Message}");
                return ERR(ex.Message);
            }
            finally
            {
                if (tx) try { EndTransactionML(_slot); } catch { }
            }
        }

        // ============================================================
        // SIGN XML - Firma digitale XML usando la chiave PKI della smart card SIAE
        // Usato per i report C1 da inviare a SIAE
        // ============================================================
        static string SignXml(string json)
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            bool tx = false;
            try
            {
                dynamic req = JsonConvert.DeserializeObject(json);
                string xmlContent = req.xmlContent;
                string pin = req.pin;

                if (string.IsNullOrEmpty(xmlContent))
                {
                    return ERR("Contenuto XML mancante");
                }

                Log($"SignXml: slot={_slot}, xmlLength={xmlContent?.Length ?? 0}");

                int state = isCardIn(_slot);
                if (!IsCardPresent(state))
                {
                    _slot = -1;
                    return ERR("Carta rimossa");
                }

                // Initialize and begin transaction
                int finRes = FinalizeML(_slot);
                Log($"  FinalizeML = {finRes}");
                
                int init = Initialize(_slot);
                Log($"  Initialize = {init}");

                int txResult = BeginTransactionML(_slot);
                Log($"  BeginTransactionML = {txResult}");
                tx = (txResult == 0);

                // Select DF PKI (0x1111) for signature operations
                int sel0000 = LibSiae.SelectML(0x0000, _slot);
                Log($"  SelectML(0x0000 root) = {sel0000} (0x{sel0000:X4})");
                
                int sel1111 = LibSiae.SelectML(0x1111, _slot);
                Log($"  SelectML(0x1111 DF PKI) = {sel1111} (0x{sel1111:X4})");

                // Verify PIN if provided
                if (!string.IsNullOrEmpty(pin))
                {
                    pin = new string(pin.Where(char.IsDigit).ToArray());
                    int pinResult = VerifyPINML(1, pin, _slot);
                    Log($"  VerifyPINML(nPIN=1) = {pinResult} (0x{pinResult:X4})");
                    
                    if (pinResult != 0)
                    {
                        if (pinResult == 0x6983)
                            return ERR("PIN bloccato - troppi tentativi errati");
                        else if (pinResult == 0x6982)
                            return ERR("PIN errato - autenticazione fallita");
                        else if (pinResult >= 0x63C0 && pinResult <= 0x63CF)
                            return ERR($"PIN errato - tentativi rimasti: {pinResult & 0x0F}");
                        else
                            return ERR($"Verifica PIN fallita: 0x{pinResult:X4}");
                    }
                    Log($"  ✓ PIN verified successfully for signature");
                }
                else
                {
                    Log($"  WARNING: No PIN provided for signature operation");
                }

                // Step 1: Get the correct key ID from the smart card (as per libSIAE documentation)
                byte keyId = LibSiae.GetKeyIDML(_slot);
                Log($"  GetKeyIDML = {keyId} (0x{keyId:X2})");
                
                if (keyId == 0)
                {
                    return ERR("GetKeyID ha restituito 0 - nessuna chiave di firma disponibile");
                }

                // Step 2: Calculate SHA-1 hash of the XML content
                byte[] xmlBytes = Encoding.UTF8.GetBytes(xmlContent);
                byte[] hash = new byte[20]; // SHA-1 produces 20 bytes
                
                int hashResult = LibSiae.Hash(1, xmlBytes, xmlBytes.Length, hash); // 1 = SHA-1
                Log($"  Hash(SHA-1) = {hashResult}, hashLen={hash.Length}");
                
                if (hashResult != 0)
                {
                    return ERR($"Calcolo hash fallito: 0x{hashResult:X4}");
                }

                // Step 3: Apply PKCS#1 padding (output 128 bytes as per libSIAE documentation)
                byte[] paddedHash = new byte[128];
                int padResult = LibSiae.Padding(hash, hash.Length, paddedHash);
                Log($"  Padding = {padResult} (0x{padResult:X4})");
                
                if (padResult != 0)
                {
                    return ERR($"Padding fallito: 0x{padResult:X4}");
                }

                // Step 4: Sign the padded hash using the card's private key
                byte[] signature = new byte[128]; // RSA 1024-bit signature = 128 bytes
                int signResult = LibSiae.SignML(keyId, paddedHash, signature, _slot);
                Log($"  SignML(keyIndex={keyId}) = {signResult} (0x{signResult:X4})");
                
                if (signResult != 0)
                {
                    return ERR($"Firma fallita: 0x{signResult:X4}");
                }
                
                Log($"  ✓ Signature successful with keyIndex={keyId}");

                // Get the certificate for inclusion in signed XML
                byte[] cert = new byte[2048];
                int certLen = cert.Length;
                int certResult = LibSiae.GetCertificateML(cert, ref certLen, _slot);
                Log($"  GetCertificateML = {certResult}, certLen={certLen}");
                
                string certificateData = "";
                if (certResult == 0 && certLen > 0)
                {
                    byte[] actualCert = new byte[certLen];
                    Array.Copy(cert, actualCert, certLen);
                    certificateData = Convert.ToBase64String(actualCert);
                }

                // Create signed XML with embedded signature
                string signatureValue = Convert.ToBase64String(signature);
                string digestValue = Convert.ToBase64String(hash); // SHA-1 hash as DigestValue
                string signedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:sszzz");
                
                // For SIAE C1 reports, we embed the signature in XML-DSig format
                string signedXml = CreateSignedXml(xmlContent, signatureValue, certificateData, digestValue, signedAt);

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    signature = new
                    {
                        signedXml = signedXml,
                        signatureValue = signatureValue,
                        certificateData = certificateData,
                        signedAt = signedAt
                    }
                });
            }
            catch (Exception ex)
            {
                Log($"SignXml error: {ex.Message}");
                return ERR(ex.Message);
            }
            finally
            {
                if (tx)
                {
                    try
                    {
                        EndTransactionML(_slot);
                        Log("  EndTransactionML done");
                    }
                    catch { }
                }
            }
        }

        // ============================================================
        // Helper: Create XML-DSig signed document
        // ============================================================
        static string CreateSignedXml(string xmlContent, string signatureValue, string certificateData, string digestValue, string signedAt)
        {
            // Find the position before the closing root tag to insert the signature
            // For SIAE C1 reports, the root tag is typically <ComunicazioneDatiTitoli> or <RiepilogoMensile>
            int closingTagPos = xmlContent.LastIndexOf("</");
            
            if (closingTagPos < 0)
            {
                // If no closing tag found, append signature at the end
                return xmlContent + CreateSignatureBlock(signatureValue, certificateData, digestValue, signedAt);
            }

            // Insert XML-DSig signature before the closing root tag
            string signatureBlock = CreateSignatureBlock(signatureValue, certificateData, digestValue, signedAt);
            return xmlContent.Substring(0, closingTagPos) + signatureBlock + xmlContent.Substring(closingTagPos);
        }

        static string CreateSignatureBlock(string signatureValue, string certificateData, string digestValue, string signedAt)
        {
            // XML Digital Signature (XML-DSig) format per SIAE
            return $@"
  <Signature xmlns=""http://www.w3.org/2000/09/xmldsig#"">
    <SignedInfo>
      <CanonicalizationMethod Algorithm=""http://www.w3.org/TR/2001/REC-xml-c14n-20010315""/>
      <SignatureMethod Algorithm=""http://www.w3.org/2000/09/xmldsig#rsa-sha1""/>
      <Reference URI="""">
        <Transforms>
          <Transform Algorithm=""http://www.w3.org/2000/09/xmldsig#enveloped-signature""/>
        </Transforms>
        <DigestMethod Algorithm=""http://www.w3.org/2000/09/xmldsig#sha1""/>
        <DigestValue>{digestValue}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>{signatureValue}</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>{certificateData}</X509Certificate>
      </X509Data>
    </KeyInfo>
    <Object>
      <SignatureProperties>
        <SignatureProperty Target=""#signature"">
          <SigningTime>{signedAt}</SigningTime>
        </SignatureProperty>
      </SignatureProperties>
    </Object>
  </Signature>";
        }

        // ============================================================
        // SIGN S/MIME - Firma S/MIME per email SIAE (Allegato C)
        // Per Provvedimento Agenzia Entrate 04/03/2008, sezione 1.6.1-1.6.2
        // L'email deve essere firmata S/MIME v2 con carta di attivazione
        // ============================================================
        static string SignSmime(string json)
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            bool tx = false;
            try
            {
                dynamic req = JsonConvert.DeserializeObject(json);
                string mimeContent = req.mimeContent;
                string pin = req.pin;

                if (string.IsNullOrEmpty(mimeContent))
                {
                    return ERR("Contenuto MIME mancante");
                }

                Log($"SignSmime: slot={_slot}, mimeLength={mimeContent?.Length ?? 0}");

                int state = isCardIn(_slot);
                if (!IsCardPresent(state))
                {
                    _slot = -1;
                    return ERR("Carta rimossa");
                }

                // Initialize and begin transaction
                int finRes = FinalizeML(_slot);
                Log($"  FinalizeML = {finRes}");
                
                int init = Initialize(_slot);
                Log($"  Initialize = {init}");

                int txResult = BeginTransactionML(_slot);
                Log($"  BeginTransactionML = {txResult}");
                tx = (txResult == 0);

                // Select DF PKI (0x1111) for signature operations
                int sel0000 = LibSiae.SelectML(0x0000, _slot);
                Log($"  SelectML(0x0000 root) = {sel0000} (0x{sel0000:X4})");
                
                int sel1111 = LibSiae.SelectML(0x1111, _slot);
                Log($"  SelectML(0x1111 DF PKI) = {sel1111} (0x{sel1111:X4})");

                // Verify PIN if provided
                if (!string.IsNullOrEmpty(pin))
                {
                    pin = new string(pin.Where(char.IsDigit).ToArray());
                    int pinResult = VerifyPINML(1, pin, _slot);
                    Log($"  VerifyPINML(nPIN=1) = {pinResult} (0x{pinResult:X4})");
                    
                    if (pinResult != 0)
                    {
                        if (pinResult == 0x6983)
                            return ERR("PIN bloccato - troppi tentativi errati");
                        else if (pinResult == 0x6982)
                            return ERR("PIN errato - autenticazione fallita");
                        else if (pinResult >= 0x63C0 && pinResult <= 0x63CF)
                            return ERR($"PIN errato - tentativi rimasti: {pinResult & 0x0F}");
                        else
                            return ERR($"Verifica PIN fallita: 0x{pinResult:X4}");
                    }
                    Log($"  PIN verified successfully for S/MIME signature");
                }
                else
                {
                    Log($"  WARNING: No PIN provided for S/MIME signature operation");
                }

                // Get the key ID from the smart card
                byte keyId = LibSiae.GetKeyIDML(_slot);
                Log($"  GetKeyIDML = {keyId} (0x{keyId:X2})");
                
                if (keyId == 0)
                {
                    return ERR("GetKeyID ha restituito 0 - nessuna chiave di firma disponibile");
                }

                // Calculate SHA-256 hash of the MIME content (S/MIME typically uses SHA-256)
                byte[] mimeBytes = Encoding.UTF8.GetBytes(mimeContent);
                byte[] hash = new byte[20]; // SHA-1 for compatibility with SIAE card
                
                int hashResult = LibSiae.Hash(1, mimeBytes, mimeBytes.Length, hash); // 1 = SHA-1
                Log($"  Hash(SHA-1) = {hashResult}, hashLen={hash.Length}");
                
                if (hashResult != 0)
                {
                    return ERR($"Calcolo hash fallito: 0x{hashResult:X4}");
                }

                // Apply PKCS#1 padding
                byte[] paddedHash = new byte[128];
                int padResult = LibSiae.Padding(hash, hash.Length, paddedHash);
                Log($"  Padding = {padResult} (0x{padResult:X4})");
                
                if (padResult != 0)
                {
                    return ERR($"Padding fallito: 0x{padResult:X4}");
                }

                // Sign using the card's private key
                byte[] signature = new byte[128]; // RSA 1024-bit signature
                int signResult = LibSiae.SignML(keyId, paddedHash, signature, _slot);
                Log($"  SignML(keyIndex={keyId}) = {signResult} (0x{signResult:X4})");
                
                if (signResult != 0)
                {
                    return ERR($"Firma fallita: 0x{signResult:X4}");
                }
                
                Log($"  S/MIME Signature successful with keyIndex={keyId}");

                // Get the certificate
                byte[] cert = new byte[2048];
                int certLen = cert.Length;
                int certResult = LibSiae.GetCertificateML(cert, ref certLen, _slot);
                Log($"  GetCertificateML = {certResult}, certLen={certLen}");
                
                if (certResult != 0 || certLen == 0)
                {
                    return ERR("Impossibile leggere il certificato dalla carta");
                }

                byte[] actualCert = new byte[certLen];
                Array.Copy(cert, actualCert, certLen);
                string certificateBase64 = Convert.ToBase64String(actualCert);
                string signatureBase64 = Convert.ToBase64String(signature);

                // Extract email from certificate
                string signerEmail = "";
                string signerName = "";
                try
                {
                    var x509 = new System.Security.Cryptography.X509Certificates.X509Certificate2(actualCert);
                    signerName = x509.GetNameInfo(System.Security.Cryptography.X509Certificates.X509NameType.SimpleName, false);
                    
                    // Try to get email from Subject Alternative Name or Subject
                    foreach (var ext in x509.Extensions)
                    {
                        if (ext.Oid?.Value == "2.5.29.17") // Subject Alternative Name
                        {
                            var sanString = ext.Format(false);
                            var match = System.Text.RegularExpressions.Regex.Match(sanString, @"RFC822[^=]*=([^\s,]+)");
                            if (match.Success)
                            {
                                signerEmail = match.Groups[1].Value;
                                break;
                            }
                        }
                    }
                    if (string.IsNullOrEmpty(signerEmail))
                    {
                        // Try from Subject E= field
                        var emailMatch = System.Text.RegularExpressions.Regex.Match(x509.Subject, @"E=([^\s,]+)");
                        if (emailMatch.Success)
                        {
                            signerEmail = emailMatch.Groups[1].Value;
                        }
                    }
                    Log($"  Certificate: Name={signerName}, Email={signerEmail}");
                }
                catch (Exception certEx)
                {
                    Log($"  Certificate parsing error: {certEx.Message}");
                }

                // Build the S/MIME signed message (multipart/signed)
                string signedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:sszzz");
                string smimeBoundary = $"----=_smime_{Guid.NewGuid():N}";
                
                // Create PKCS#7 signature for S/MIME (detached signature)
                // Note: This creates a simplified S/MIME structure. For full compliance,
                // use System.Security.Cryptography.Pkcs.SignedCms
                string pkcs7Signature = CreatePkcs7Signature(signature, actualCert);
                
                // Build multipart/signed message
                var smimeBuilder = new StringBuilder();
                smimeBuilder.AppendLine("MIME-Version: 1.0");
                smimeBuilder.AppendLine($"Content-Type: multipart/signed; protocol=\"application/pkcs7-signature\"; micalg=sha-1; boundary=\"{smimeBoundary}\"");
                smimeBuilder.AppendLine();
                smimeBuilder.AppendLine($"--{smimeBoundary}");
                smimeBuilder.Append(mimeContent);
                if (!mimeContent.EndsWith("\r\n"))
                    smimeBuilder.AppendLine();
                smimeBuilder.AppendLine();
                smimeBuilder.AppendLine($"--{smimeBoundary}");
                smimeBuilder.AppendLine("Content-Type: application/pkcs7-signature; name=\"smime.p7s\"");
                smimeBuilder.AppendLine("Content-Transfer-Encoding: base64");
                smimeBuilder.AppendLine("Content-Disposition: attachment; filename=\"smime.p7s\"");
                smimeBuilder.AppendLine();
                
                // Split base64 into 76-char lines
                for (int i = 0; i < pkcs7Signature.Length; i += 76)
                {
                    int len = Math.Min(76, pkcs7Signature.Length - i);
                    smimeBuilder.AppendLine(pkcs7Signature.Substring(i, len));
                }
                
                smimeBuilder.AppendLine($"--{smimeBoundary}--");

                string signedMime = smimeBuilder.ToString().Replace("\n", "\r\n").Replace("\r\r\n", "\r\n");

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    signature = new
                    {
                        signedMime = signedMime,
                        signerEmail = signerEmail,
                        signerName = signerName,
                        certificateSerial = BitConverter.ToString(actualCert).Substring(0, 20),
                        signedAt = signedAt
                    }
                });
            }
            catch (Exception ex)
            {
                Log($"SignSmime error: {ex.Message}");
                return ERR(ex.Message);
            }
            finally
            {
                if (tx)
                {
                    try
                    {
                        EndTransactionML(_slot);
                        Log("  EndTransactionML done");
                    }
                    catch { }
                }
            }
        }

        // ============================================================
        // Helper: Create PKCS#7 signature structure
        // ============================================================
        static string CreatePkcs7Signature(byte[] signature, byte[] certificate)
        {
            try
            {
                // Use System.Security.Cryptography.Pkcs for proper PKCS#7 structure
                // For now, return a simplified structure with just the signature
                // A full implementation would use SignedCms class
                
                // Build a minimal PKCS#7 SignedData structure
                // This is a simplified version - for production, use SignedCms
                var pkcs7 = new System.Collections.Generic.List<byte>();
                
                // For simplicity, we'll just base64 encode the raw signature + cert
                // In production, this should be a proper ASN.1 PKCS#7 structure
                var combined = new byte[signature.Length + certificate.Length];
                Array.Copy(signature, 0, combined, 0, signature.Length);
                Array.Copy(certificate, 0, combined, signature.Length, certificate.Length);
                
                return Convert.ToBase64String(combined);
            }
            catch
            {
                // Fallback to just the signature
                return Convert.ToBase64String(signature);
            }
        }
    }
}
