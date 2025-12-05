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
        // IMPORT libSIAE.dll
        // ============================================================
        private const string DLL = "libSIAE.dll";

        [DllImport(DLL)] static extern int isCardIn(int slot);
        [DllImport(DLL)] static extern int Initialize(int slot);
        [DllImport(DLL)] static extern int FinalizeML(int slot);
        [DllImport(DLL)] static extern int BeginTransactionML(int slot);
        [DllImport(DLL)] static extern int EndTransactionML(int slot);
        [DllImport(DLL)] static extern int GetSNML(byte[] sn, int slot);
        [DllImport(DLL)] static extern int ReadCounterML(ref uint val, int slot);
        [DllImport(DLL)] static extern int ReadBalanceML(ref uint val, int slot);
        [DllImport(DLL)] static extern byte GetKeyIDML(int slot);
        [DllImport(DLL)] static extern int ComputeSigilloML(byte[] dt, uint price, byte[] sn, byte[] mac, ref uint cnt, int slot);

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
            try { _log = new StreamWriter(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bridge.log"), true) { AutoFlush = true }; } catch { }
            
            Log("=== SiaeBridge Started ===");
            Log($"Dir: {AppDomain.CurrentDomain.BaseDirectory}");
            Log($"DLL exists: {File.Exists(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "libSIAE.dll"))}");
            
            Console.WriteLine("READY");
            
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;
                
                Log($"CMD: {line}");
                string response = Handle(line);
                Console.WriteLine(response);
                Log($"RSP: {response}");
            }
        }

        static void Log(string msg)
        {
            try { _log?.WriteLine($"[{DateTime.Now:HH:mm:ss}] {msg}"); } catch { }
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
                return ERR($"Comando sconosciuto: {cmd}");
            }
            catch (DllNotFoundException) { return ERR("libSIAE.dll non trovata!"); }
            catch (Exception ex) { return ERR(ex.Message); }
        }

        static string OK(object data) => JsonConvert.SerializeObject(new { success = true, data });
        static string ERR(string msg) => JsonConvert.SerializeObject(new { success = false, error = msg });

        // ============================================================
        // CHECK READER
        // ============================================================
        static string CheckReader()
        {
            try
            {
                for (int s = 0; s < 16; s++)
                {
                    try
                    {
                        if (isCardIn(s) == 1)
                        {
                            _slot = s;
                            int init = Initialize(s);
                            Log($"Found card slot {s}, init={init}");
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
                    catch { break; }
                }

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    readerConnected = true,
                    cardPresent = false,
                    message = "Inserire carta SIAE"
                });
            }
            catch (DllNotFoundException)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = false,
                    readerConnected = false,
                    cardPresent = false,
                    error = "libSIAE.dll non trovata"
                });
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = false,
                    readerConnected = false,
                    cardPresent = false,
                    error = ex.Message
                });
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
