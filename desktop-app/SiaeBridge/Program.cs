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
            Log("SiaeBridge v3.4 - Enhanced card data logging + error reporting");
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
                if (cmd.StartsWith("VERIFY_PIN:")) return VerifyPin(cmd.Substring(11));
                if (cmd.StartsWith("COMPUTE_SIGILLO:")) return ComputeSigillo(cmd.Substring(16));
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

                // nPIN = identificatore PIN (provare diversi valori)
                // Dalla documentazione SIAE test.c: pVerifyPINML(1, pin, slot)
                // Errore 0x6A88 = "Referenced data not found" = nPIN sbagliato
                // Errore 0xFFFF = Errore generico
                
                // Valori nPIN da provare in ordine
                int[] nPinValues = { 1, 0, 2, 0x81, 0x82, 0x01, 0x00 };
                int pinResult = -1;
                int successfulNPin = -1;
                
                foreach (int nPin in nPinValues)
                {
                    pinResult = VerifyPINML(nPin, pin, _slot);
                    Log($"  VerifyPINML(nPIN={nPin} (0x{nPin:X2}), pin=***, slot={_slot}) = {pinResult} (0x{pinResult:X4})");
                    
                    if (pinResult == 0)
                    {
                        // Successo! Ricorda quale nPIN ha funzionato
                        successfulNPin = nPin;
                        Log($"  ✓ PIN VERIFICATO con nPIN={nPin}!");
                        break;
                    }
                    else if (pinResult == 0x63C0 || pinResult == 0x63C1 || pinResult == 0x63C2 || pinResult == 0x63C3)
                    {
                        // PIN sbagliato ma nPIN corretto - non continuare a provare altri nPIN
                        Log($"  PIN errato (tentativi rimasti: {pinResult & 0x0F})");
                        break;
                    }
                    else if (pinResult == 0x6983)
                    {
                        // PIN bloccato
                        Log($"  PIN BLOCCATO!");
                        break;
                    }
                    // Per altri errori (0x6A88, 0xFFFF, ecc.), continua a provare il prossimo nPIN
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

                int state = isCardIn(_slot);
                if (!IsCardPresent(state)) { _slot = -1; return ERR("Carta rimossa"); }

                Initialize(_slot);
                BeginTransactionML(_slot);
                tx = true;

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
    }
}
