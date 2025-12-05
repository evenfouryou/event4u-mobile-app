using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Newtonsoft.Json;

namespace SiaeBridge
{
    class Program
    {
        // ============================================================
        // IMPORT libSIAE.dll - 32-bit ONLY!
        // ============================================================
        private const string DLL = "libSIAE.dll";

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern int isCardIn(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern int Initialize(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern int FinalizeML(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern int BeginTransactionML(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern int EndTransactionML(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern int GetSNML(byte[] sn, int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern int ReadCounterML(ref uint val, int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern int ReadBalanceML(ref uint val, int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern byte GetKeyIDML(int slot);

        [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
        static extern int ComputeSigilloML(byte[] dt, uint price, byte[] sn, byte[] mac, ref uint cnt, int slot);

        // Windows API per verificare se il lettore è realmente presente
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
        static bool _dllLoaded = false;
        static string _dllError = null;

        // ============================================================
        // MAIN
        // ============================================================
        static void Main()
        {
            string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bridge.log");
            try { _log = new StreamWriter(logPath, true) { AutoFlush = true }; } catch { }

            Log("═══════════════════════════════════════════════════════");
            Log("SiaeBridge v3.0 - DEBUG VERSION");
            Log($"Time: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            Log($"Dir: {AppDomain.CurrentDomain.BaseDirectory}");
            Log($"64-bit Process: {Environment.Is64BitProcess}");
            Log($"64-bit OS: {Environment.Is64BitOperatingSystem}");
            Log($"CLR: {Environment.Version}");

            // Verifica DLL
            string dllPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "libSIAE.dll");
            if (File.Exists(dllPath))
            {
                var info = new FileInfo(dllPath);
                Log($"✓ libSIAE.dll: {info.Length} bytes");
                
                // Prova a caricare la DLL
                try
                {
                    IntPtr handle = LoadLibrary(dllPath);
                    if (handle != IntPtr.Zero)
                    {
                        Log("✓ DLL loaded successfully");
                        _dllLoaded = true;
                        FreeLibrary(handle);
                    }
                    else
                    {
                        int err = Marshal.GetLastWin32Error();
                        _dllError = $"LoadLibrary failed: error {err}";
                        Log($"✗ {_dllError}");
                        
                        if (Environment.Is64BitProcess)
                        {
                            Log("✗ ERRORE: Processo a 64-bit! libSIAE.dll richiede 32-bit!");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _dllError = ex.Message;
                    Log($"✗ DLL load error: {ex.Message}");
                }
            }
            else
            {
                _dllError = "libSIAE.dll not found";
                Log($"✗ {_dllError}");
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

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern IntPtr LoadLibrary(string lpFileName);

        [DllImport("kernel32.dll")]
        static extern bool FreeLibrary(IntPtr hModule);

        static void Log(string msg)
        {
            try { _log?.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] {msg}"); } catch { }
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
                if (cmd.StartsWith("COMPUTE_SIGILLO:")) return ComputeSigillo(cmd.Substring(16));
                if (cmd == "DEBUG") return GetDebugInfo();
                return ERR($"Comando sconosciuto: {cmd}");
            }
            catch (DllNotFoundException ex)
            {
                Log($"DllNotFoundException: {ex.Message}");
                return ERR("libSIAE.dll non trovata o incompatibile (32/64 bit?)");
            }
            catch (BadImageFormatException ex)
            {
                Log($"BadImageFormatException: {ex.Message}");
                return ERR("libSIAE.dll incompatibile - processo 64-bit, DLL 32-bit!");
            }
            catch (Exception ex)
            {
                Log($"Exception: {ex.GetType().Name}: {ex.Message}");
                return ERR(ex.Message);
            }
        }

        static string OK(object data) => JsonConvert.SerializeObject(new { success = true, data });
        static string ERR(string msg) => JsonConvert.SerializeObject(new { success = false, error = msg });

        static string GetDebugInfo()
        {
            return JsonConvert.SerializeObject(new
            {
                success = true,
                is64BitProcess = Environment.Is64BitProcess,
                dllLoaded = _dllLoaded,
                dllError = _dllError,
                clrVersion = Environment.Version.ToString()
            });
        }

        // ============================================================
        // CHECK READER - CON VERIFICA REALE
        // ============================================================
        static string CheckReader()
        {
            // Prima verifica se ci sono lettori smart card usando Windows API
            bool hasReaders = CheckWindowsSmartCardReaders();
            Log($"Windows SmartCard readers present: {hasReaders}");

            if (!hasReaders)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    readerConnected = false,
                    cardPresent = false,
                    message = "Nessun lettore smart card rilevato"
                });
            }

            // Verifica architettura
            if (Environment.Is64BitProcess)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = false,
                    readerConnected = hasReaders,
                    cardPresent = false,
                    error = "Errore: processo a 64-bit, libSIAE.dll richiede 32-bit!"
                });
            }

            // Prova a usare libSIAE
            try
            {
                for (int s = 0; s < 16; s++)
                {
                    try
                    {
                        Log($"  isCardIn({s})...");
                        int result = isCardIn(s);
                        Log($"  isCardIn({s}) = {result}");

                        if (result == 1)
                        {
                            _slot = s;
                            Log($"  Card found in slot {s}, initializing...");
                            int init = Initialize(s);
                            Log($"  Initialize({s}) = {init}");

                            return JsonConvert.SerializeObject(new
                            {
                                success = true,
                                readerConnected = true,
                                cardPresent = true,
                                slot = s,
                                message = "Carta SIAE rilevata"
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        Log($"  Slot {s} error: {ex.Message}");
                        break;
                    }
                }

                // Lettore presente ma nessuna carta
                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    readerConnected = true,
                    cardPresent = false,
                    message = "Inserire carta SIAE"
                });
            }
            catch (BadImageFormatException)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = false,
                    readerConnected = hasReaders,
                    cardPresent = false,
                    error = "DLL 32-bit incompatibile con processo 64-bit!"
                });
            }
            catch (DllNotFoundException)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = false,
                    readerConnected = hasReaders,
                    cardPresent = false,
                    error = "libSIAE.dll non trovata"
                });
            }
        }

        static bool CheckWindowsSmartCardReaders()
        {
            try
            {
                IntPtr context = IntPtr.Zero;
                int result = SCardEstablishContext(2, IntPtr.Zero, IntPtr.Zero, ref context); // SCARD_SCOPE_SYSTEM = 2
                
                if (result != 0)
                {
                    Log($"  SCardEstablishContext failed: {result}");
                    return false;
                }

                int size = 0;
                result = SCardListReadersW(context, null, null, ref size);
                
                bool hasReaders = (result == 0 && size > 0);
                
                if (hasReaders)
                {
                    byte[] readers = new byte[size * 2];
                    result = SCardListReadersW(context, null, readers, ref size);
                    string readerList = Encoding.Unicode.GetString(readers);
                    Log($"  Readers: {readerList.Replace('\0', '|')}");
                }

                SCardReleaseContext(context);
                return hasReaders;
            }
            catch (Exception ex)
            {
                Log($"  CheckWindowsSmartCardReaders error: {ex.Message}");
                return false;
            }
        }

        // ============================================================
        // READ CARD
        // ============================================================
        static string ReadCard()
        {
            if (_slot < 0) return ERR("Nessuna carta rilevata");

            bool tx = false;
            try
            {
                if (isCardIn(_slot) != 1) { _slot = -1; return ERR("Carta rimossa"); }

                Initialize(_slot);
                BeginTransactionML(_slot);
                tx = true;

                byte[] sn = new byte[8];
                int r = GetSNML(sn, _slot);
                if (r != 0) return ERR($"Lettura SN fallita: {r}");

                uint cnt = 0, bal = 0;
                ReadCounterML(ref cnt, _slot);
                ReadBalanceML(ref bal, _slot);
                byte key = GetKeyIDML(_slot);

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    serialNumber = BitConverter.ToString(sn).Replace("-", ""),
                    counter = cnt,
                    balance = bal,
                    keyId = (int)key,
                    slot = _slot
                });
            }
            catch (Exception ex) { return ERR(ex.Message); }
            finally { if (tx) try { EndTransactionML(_slot); } catch { } }
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

                if (isCardIn(_slot) != 1) { _slot = -1; return ERR("Carta rimossa"); }

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

                int r = ComputeSigilloML(bcd, cents, sn, mac, ref cnt, _slot);
                if (r != 0) return ERR($"Sigillo fallito: {r}");

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
            catch (Exception ex) { return ERR(ex.Message); }
            finally { if (tx) try { EndTransactionML(_slot); } catch { } }
        }
    }
}
