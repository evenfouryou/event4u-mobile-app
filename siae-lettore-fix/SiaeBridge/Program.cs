using System;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
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

        // ============================================================
        // IMPORT libSIAEp7.dll - per firme PKCS#7/P7M (CAdES-BES)
        // ============================================================
        private const string DLL_P7 = "libSIAEp7.dll";

        [DllImport(DLL_P7, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        static extern int PKCS7SignML(
            [MarshalAs(UnmanagedType.LPStr)] string pin,
            uint slot,
            [MarshalAs(UnmanagedType.LPStr)] string szInputFileName,
            [MarshalAs(UnmanagedType.LPStr)] string szOutputFileName,
            int bInitialize);

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
            Log("SiaeBridge v3.7 - PKCS7SignML direct smart card signing (libSIAEp7.dll)");
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

            string dllP7Path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "libSIAEp7.dll");
            if (File.Exists(dllP7Path))
            {
                Log($"✓ libSIAEp7.dll: {new FileInfo(dllP7Path).Length} bytes (PKCS7/P7M signing)");
            }
            else
            {
                Log("✗ libSIAEp7.dll NOT FOUND - P7M signing will fail!");
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
                if (cmd == "READ_EFFF") return ReadEfff();
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
        // READ EFFF - Legge file EFFF dalla Smart Card SIAE
        // Contiene 15 campi anagrafici (DF 11 11, EF FF)
        // Conforme a Descrizione_contenuto_SmartCardTestxBA-V102.pdf
        // ============================================================
        static string ReadEfff()
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            bool tx = false;
            try
            {
                Log($"ReadEfff: slot={_slot}");

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

                // Navigate to DF PKI (0x1111) which contains EFFF
                int sel0000 = LibSiae.SelectML(0x0000, _slot);
                Log($"  SelectML(0x0000 root) = {sel0000} (0x{sel0000:X4})");
                
                int sel1111 = LibSiae.SelectML(0x1111, _slot);
                Log($"  SelectML(0x1111 DF PKI) = {sel1111} (0x{sel1111:X4})");
                
                // Select EF FF (anagrafica file) - File ID is 0xEFFF per SIAE documentation
                int selEFFF = LibSiae.SelectML(0xEFFF, _slot);
                Log($"  SelectML(0xEFFF EF FF) = {selEFFF} (0x{selEFFF:X4})");

                if (selEFFF != 0)
                {
                    // Fallback: try 0x00FF in case card uses alternative addressing
                    selEFFF = LibSiae.SelectML(0x00FF, _slot);
                    Log($"  SelectML(0x00FF alt) = {selEFFF} (0x{selEFFF:X4})");
                }

                // EFFF contains 15 variable-length records
                // Field lengths according to specification:
                // 1. systemId (8), 2. contactName (40), 3. contactLastName (40), 4. contactCodFis (18)
                // 5. systemLocation (100), 6. contactEmail (50), 7. siaeEmail (40)
                // 8. partnerName (60), 9. partnerCodFis (18), 10. partnerRegistroImprese (18)
                // 11. partnerNation (2), 12. systemApprCode (20), 13. systemApprDate (20)
                // 14. contactRepresentationType (1), 15. userDataFileVersion (5)

                var efffData = new
                {
                    systemId = ReadEfffField(1, 8),
                    contactName = ReadEfffField(2, 40),
                    contactLastName = ReadEfffField(3, 40),
                    contactCodFis = ReadEfffField(4, 18),
                    systemLocation = ReadEfffField(5, 100),
                    contactEmail = ReadEfffField(6, 50),
                    siaeEmail = ReadEfffField(7, 40),
                    partnerName = ReadEfffField(8, 60),
                    partnerCodFis = ReadEfffField(9, 18),
                    partnerRegistroImprese = ReadEfffField(10, 18),
                    partnerNation = ReadEfffField(11, 2),
                    systemApprCode = ReadEfffField(12, 20),
                    systemApprDate = ReadEfffField(13, 20),
                    contactRepresentationType = ReadEfffField(14, 1),
                    userDataFileVersion = ReadEfffField(15, 5)
                };

                Log($"  EFFF Data read: systemId={efffData.systemId}, siaeEmail={efffData.siaeEmail}");

                // Determine if test card based on systemId prefix
                bool isTestCard = !string.IsNullOrEmpty(efffData.systemId) && 
                                  efffData.systemId.ToUpper().StartsWith("P");

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    efffData = efffData,
                    isTestCard = isTestCard,
                    environment = isTestCard ? "test" : "production",
                    slot = _slot
                });
            }
            catch (Exception ex)
            {
                Log($"ReadEfff error: {ex.Message}");
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

        /// <summary>
        /// Read a single field from EFFF file by record number
        /// </summary>
        static string ReadEfffField(int recordNumber, int maxLen)
        {
            try
            {
                byte[] buffer = new byte[maxLen + 2]; // Extra bytes for safety
                int len = buffer.Length;
                
                int result = LibSiae.ReadRecordML(recordNumber, buffer, ref len, _slot);
                
                if (result != 0)
                {
                    Log($"    ReadRecordML({recordNumber}) = 0x{result:X4}, len={len}");
                    return "";
                }

                // Trim null bytes and convert to string
                string value = Encoding.ASCII.GetString(buffer, 0, len).TrimEnd('\0', ' ');
                Log($"    Record {recordNumber}: \"{value}\" (len={len})");
                return value;
            }
            catch (Exception ex)
            {
                Log($"    ReadEfffField({recordNumber}) error: {ex.Message}");
                return "";
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
        // Formato: oldPin,newPin oppure pinNumber,oldPin,newPin
        // SIAE cards have PIN1 (nPIN=1) for Sigillo and PIN2 (nPIN=2) for PKI
        // ============================================================
        static string ChangePin(string args)
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            // Parse arguments: oldPin,newPin OR pinNumber,oldPin,newPin
            var parts = args.Split(',');
            int pinNumber = 1; // Default to PIN1 (Sigillo)
            string oldPin, newPin;

            if (parts.Length == 2)
            {
                oldPin = new string(parts[0].Where(char.IsDigit).ToArray());
                newPin = new string(parts[1].Where(char.IsDigit).ToArray());
            }
            else if (parts.Length == 3)
            {
                if (!int.TryParse(parts[0], out pinNumber) || (pinNumber != 1 && pinNumber != 2))
                {
                    return ERR("Numero PIN non valido - deve essere 1 (Sigillo) o 2 (PKI)");
                }
                oldPin = new string(parts[1].Where(char.IsDigit).ToArray());
                newPin = new string(parts[2].Where(char.IsDigit).ToArray());
            }
            else
            {
                return ERR("Formato: CHANGE_PIN:oldPin,newPin oppure CHANGE_PIN:pinNumber,oldPin,newPin");
            }

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
                Log($"ChangePin: slot={_slot}, pinNumber={pinNumber}, oldPin=****, newPin=****");

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

                // Select appropriate DF based on PIN number
                // PIN1 = DF Sigilli (0x1112), PIN2 = DF PKI (0x1111)
                int sel0000 = LibSiae.SelectML(0x0000, _slot);
                Log($"  SelectML(0x0000) = {sel0000}");
                
                int selDF;
                if (pinNumber == 1)
                {
                    selDF = LibSiae.SelectML(0x1112, _slot);
                    Log($"  SelectML(0x1112 DF Sigilli) = {selDF}");
                }
                else
                {
                    selDF = LibSiae.SelectML(0x1111, _slot);
                    Log($"  SelectML(0x1111 DF PKI) = {selDF}");
                }

                // Change PIN
                int result = LibSiae.ChangePINML(pinNumber, oldPin, newPin, _slot);
                Log($"  ChangePINML(nPIN={pinNumber}) = {result} (0x{result:X4})");

                // Decode retries from error code 0x63CX
                int? retriesRemaining = null;
                if (result >= 0x63C0 && result <= 0x63CF)
                {
                    retriesRemaining = result & 0x0F;
                    Log($"  Retries remaining: {retriesRemaining}");
                }

                if (result == 0)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        changed = true,
                        pinNumber = pinNumber,
                        message = $"PIN{pinNumber} cambiato con successo"
                    });
                }
                else if (result == 0x6983)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        changed = false,
                        pinNumber = pinNumber,
                        error = $"PIN{pinNumber} bloccato - usare PUK per sbloccare",
                        errorCode = result,
                        retriesRemaining = 0
                    });
                }
                else if (result == 0x6982 || (result >= 0x63C0 && result <= 0x63CF))
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        changed = false,
                        pinNumber = pinNumber,
                        error = "PIN attuale errato",
                        errorCode = result,
                        retriesRemaining = retriesRemaining
                    });
                }
                else
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        changed = false,
                        pinNumber = pinNumber,
                        error = $"Errore cambio PIN{pinNumber}: 0x{result:X4} - {LibSiae.GetErrorMessage(result)}",
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
        // Formato: puk,newPin oppure pinNumber,puk,newPin
        // SIAE cards have PIN1 (nPIN=1) for Sigillo and PIN2 (nPIN=2) for PKI
        // PUK is used to unlock blocked PINs and set a new PIN
        // ============================================================
        static string UnlockPuk(string args)
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata - prima fai CHECK_READER");

            // Parse arguments: puk,newPin OR pinNumber,puk,newPin
            var parts = args.Split(',');
            int pinNumber = 1; // Default to PIN1 (Sigillo)
            string puk, newPin;

            if (parts.Length == 2)
            {
                puk = new string(parts[0].Where(char.IsDigit).ToArray());
                newPin = new string(parts[1].Where(char.IsDigit).ToArray());
            }
            else if (parts.Length == 3)
            {
                if (!int.TryParse(parts[0], out pinNumber) || (pinNumber != 1 && pinNumber != 2))
                {
                    return ERR("Numero PIN non valido - deve essere 1 (Sigillo) o 2 (PKI)");
                }
                puk = new string(parts[1].Where(char.IsDigit).ToArray());
                newPin = new string(parts[2].Where(char.IsDigit).ToArray());
            }
            else
            {
                return ERR("Formato: UNLOCK_PUK:puk,newPin oppure UNLOCK_PUK:pinNumber,puk,newPin");
            }

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
                Log($"UnlockPuk: slot={_slot}, pinNumber={pinNumber}, puk=********, newPin=****");

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

                // Select appropriate DF based on PIN number
                // PIN1 = DF Sigilli (0x1112), PIN2 = DF PKI (0x1111)
                int sel0000 = LibSiae.SelectML(0x0000, _slot);
                Log($"  SelectML(0x0000) = {sel0000}");
                
                int selDF;
                if (pinNumber == 1)
                {
                    selDF = LibSiae.SelectML(0x1112, _slot);
                    Log($"  SelectML(0x1112 DF Sigilli) = {selDF}");
                }
                else
                {
                    selDF = LibSiae.SelectML(0x1111, _slot);
                    Log($"  SelectML(0x1111 DF PKI) = {selDF}");
                }

                // Unlock PIN with PUK
                int result = LibSiae.UnblockPINML(pinNumber, puk, newPin, _slot);
                Log($"  UnblockPINML(nPIN={pinNumber}) = {result} (0x{result:X4})");

                // Decode retries from error code 0x63CX
                int? pukRetriesRemaining = null;
                if (result >= 0x63C0 && result <= 0x63CF)
                {
                    pukRetriesRemaining = result & 0x0F;
                    Log($"  PUK retries remaining: {pukRetriesRemaining}");
                }

                if (result == 0)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        unlocked = true,
                        pinNumber = pinNumber,
                        message = $"PIN{pinNumber} sbloccato con successo - nuovo PIN impostato"
                    });
                }
                else if (result == 0x6983)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        unlocked = false,
                        pinNumber = pinNumber,
                        error = "PUK bloccato - carta non recuperabile, contattare SIAE per sostituzione",
                        errorCode = result,
                        pukRetriesRemaining = 0
                    });
                }
                else if (result == 0x6982 || (result >= 0x63C0 && result <= 0x63CF))
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        unlocked = false,
                        pinNumber = pinNumber,
                        error = "PUK errato",
                        errorCode = result,
                        pukRetriesRemaining = pukRetriesRemaining
                    });
                }
                else
                {
                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        unlocked = false,
                        pinNumber = pinNumber,
                        error = $"Errore sblocco PIN{pinNumber}: 0x{result:X4} - {LibSiae.GetErrorMessage(result)}",
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
        // SIGN XML - Firma digitale CAdES-BES con SHA-256
        // Produce file P7M conforme ai requisiti SIAE
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

                Log($"SignXml (CAdES-BES): slot={_slot}, xmlLength={xmlContent?.Length ?? 0}");

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

                // Verify PIN if provided (using libSIAE to unlock the card)
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

                // Convert XML to UTF-8 bytes
                byte[] xmlBytes = Encoding.UTF8.GetBytes(xmlContent);
                Log($"  XML bytes: {xmlBytes.Length}");

                // ============================================================
                // NUOVO: Usa CAdES-BES con SHA-256 invece di XMLDSig con SHA-1
                // ============================================================
                var (success, p7mBase64, error, signedAt) = CreateCAdESSignature(xmlBytes, pin);

                if (!success)
                {
                    return ERR(error ?? "Errore sconosciuto nella firma CAdES");
                }

                Log($"  ✓ CAdES-BES signature created successfully");

                // Ritorna il P7M in formato Base64
                // Il server web salverà questo come file binario .p7m
                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    signature = new
                    {
                        p7mBase64 = p7mBase64,           // File P7M firmato (CAdES-BES)
                        signedAt = signedAt,
                        format = "CAdES-BES",            // Formato firma
                        algorithm = "SHA-256",           // Algoritmo hash
                        xmlContent = xmlContent          // XML originale (per riferimento)
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
        // CAdES-BES SIGNATURE - Firma PKCS#7/P7M usando libSIAEp7.dll
        // Usa direttamente la smart card SIAE senza passare per Windows CSP
        // Richiesto per report C1 inviati a SIAE
        // ============================================================

        /// <summary>
        /// Crea firma PKCS#7/P7M usando libSIAEp7.dll direttamente dalla smart card SIAE
        /// Ritorna il file P7M firmato in Base64
        /// </summary>
        static (bool success, string p7mBase64, string error, string signedAt) CreateCAdESSignature(byte[] xmlBytes, string pin)
        {
            string inputFile = null;
            string outputFile = null;
            
            try
            {
                Log($"CreateCAdESSignature (libSIAEp7): xmlBytes.Length={xmlBytes.Length}, slot={_slot}");

                // Verifica che libSIAEp7.dll esista
                string p7DllPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "libSIAEp7.dll");
                if (!File.Exists(p7DllPath))
                {
                    Log($"  ERROR: libSIAEp7.dll not found at {p7DllPath}");
                    return (false, null, "libSIAEp7.dll non trovata - impossibile creare firma P7M", null);
                }
                Log($"  ✓ libSIAEp7.dll found: {new FileInfo(p7DllPath).Length} bytes");

                // Crea file temporanei per input/output
                string tempDir = Path.GetTempPath();
                string timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
                inputFile = Path.Combine(tempDir, $"siae_xml_{timestamp}.xml");
                outputFile = Path.Combine(tempDir, $"siae_xml_{timestamp}.xml.p7m");

                Log($"  Input file: {inputFile}");
                Log($"  Output file: {outputFile}");

                // Scrivi l'XML nel file temporaneo
                File.WriteAllBytes(inputFile, xmlBytes);
                Log($"  ✓ XML written to temp file ({xmlBytes.Length} bytes)");

                // Chiama PKCS7SignML per creare il P7M firmato
                // bInitialize = 0 perché la carta è già inizializzata
                Log($"  Calling PKCS7SignML(pin=***, slot={_slot}, input={inputFile}, output={outputFile}, init=0)...");
                
                int result = PKCS7SignML(pin, (uint)_slot, inputFile, outputFile, 0);
                Log($"  PKCS7SignML returned: {result} (0x{result:X4})");

                if (result != 0)
                {
                    // Interpreta i codici di errore comuni
                    string errorMsg = result switch
                    {
                        0x6983 => "PIN bloccato - troppi tentativi errati",
                        0x6982 => "PIN errato - autenticazione fallita",
                        0x6A82 => "File non trovato sulla smart card",
                        0x6A80 => "Parametri errati",
                        _ when result >= 0x63C0 && result <= 0x63CF => $"PIN errato - tentativi rimasti: {result & 0x0F}",
                        _ => $"Errore firma PKCS7: 0x{result:X4}"
                    };
                    return (false, null, errorMsg, null);
                }

                // Verifica che il file P7M sia stato creato
                if (!File.Exists(outputFile))
                {
                    Log($"  ERROR: Output P7M file not created");
                    return (false, null, "File P7M non creato - errore durante la firma", null);
                }

                // Leggi il file P7M e converti in Base64
                byte[] p7mBytes = File.ReadAllBytes(outputFile);
                string p7mBase64 = Convert.ToBase64String(p7mBytes);
                string signedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:sszzz");

                Log($"  ✓ P7M created successfully: {p7mBytes.Length} bytes");

                return (true, p7mBase64, null, signedAt);
            }
            catch (DllNotFoundException dllEx)
            {
                Log($"CreateCAdESSignature DLL error: {dllEx.Message}");
                return (false, null, "libSIAEp7.dll non trovata o non caricabile", null);
            }
            catch (Exception ex)
            {
                Log($"CreateCAdESSignature error: {ex.GetType().Name}: {ex.Message}");
                return (false, null, ex.Message, null);
            }
            finally
            {
                // Pulisci i file temporanei
                try
                {
                    if (inputFile != null && File.Exists(inputFile))
                    {
                        File.Delete(inputFile);
                        Log($"  Cleaned up input file");
                    }
                    if (outputFile != null && File.Exists(outputFile))
                    {
                        File.Delete(outputFile);
                        Log($"  Cleaned up output file");
                    }
                }
                catch (Exception cleanupEx)
                {
                    Log($"  Cleanup error: {cleanupEx.Message}");
                }
            }
        }

        /// <summary>
        /// Cerca il certificato della Smart Card SIAE nello store Windows
        /// Il certificato deve essere emesso da una CA italiana riconosciuta (InfoCert, Aruba, etc.)
        /// e NON deve essere auto-firmato
        /// </summary>
        static X509Certificate2 GetSmartCardCertificateFromStore()
        {
            Log("  Searching for SIAE Smart Card certificate in Windows store...");

            // Cerca in entrambi gli store: CurrentUser e LocalMachine
            StoreLocation[] locations = { StoreLocation.CurrentUser, StoreLocation.LocalMachine };
            
            foreach (var location in locations)
            {
                try
                {
                    X509Store store = new X509Store(StoreName.My, location);
                    store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);

                    try
                    {
                        foreach (X509Certificate2 cert in store.Certificates)
                        {
                            // Deve avere una chiave privata (tipico delle Smart Card)
                            if (!cert.HasPrivateKey)
                                continue;

                            // Il certificato deve essere valido
                            if (DateTime.Now < cert.NotBefore || DateTime.Now > cert.NotAfter)
                                continue;

                            string issuer = cert.Issuer.ToUpperInvariant();
                            string subject = cert.Subject.ToUpperInvariant();

                            Log($"    [{location}] Checking cert: Subject={cert.Subject}, Issuer={cert.Issuer}");

                            // IMPORTANTE: Escludi certificati auto-firmati (Issuer == Subject)
                            // Questi sono tipicamente certificati di test/sviluppo, non SIAE
                            if (cert.Issuer == cert.Subject)
                            {
                                Log($"    -> Skipping self-signed certificate");
                                continue;
                            }

                            // Escludi certificati con GUID nel nome (tipicamente auto-generati)
                            if (System.Text.RegularExpressions.Regex.IsMatch(subject, @"[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}"))
                            {
                                Log($"    -> Skipping GUID-based certificate");
                                continue;
                            }

                            // Cerca certificati emessi da CA italiane riconosciute
                            // tipicamente usati per le carte SIAE
                            bool isSiaeCompatible = 
                                issuer.Contains("INFOCERT") ||
                                issuer.Contains("ARUBA") ||
                                issuer.Contains("ACTALIS") ||
                                issuer.Contains("POSTE") ||
                                issuer.Contains("NAMIRIAL") ||
                                issuer.Contains("INTESI") ||
                                issuer.Contains("TELECOM") ||
                                issuer.Contains("IN.TE.S.A") ||
                                subject.Contains("SIAE") ||
                                issuer.Contains("SIAE");

                            if (isSiaeCompatible)
                            {
                                Log($"    -> SIAE-compatible certificate found from {location}!");
                                store.Close();
                                return cert;
                            }
                        }
                    }
                    finally
                    {
                        store.Close();
                    }
                }
                catch (Exception ex)
                {
                    Log($"  Error accessing {location} store: {ex.Message}");
                }
            }

            Log($"  No SIAE-compatible certificate found in Windows store");
            Log($"  NOTE: The smart card certificate must be accessible via Windows CSP.");
            Log($"  Make sure the Bit4id minidriver is installed and the certificate is visible in certmgr.msc");
            return null;
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
