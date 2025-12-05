using System;
using System.IO;
using System.Text;
using System.Threading;
using Newtonsoft.Json;

namespace SiaeBridge
{
    /// <summary>
    /// SiaeBridge - Bridge between Electron and libSIAE.dll
    /// 
    /// CRITICAL: Correct sequence for card operations:
    /// 1. isCardIn(slot) - Check if card is present
    /// 2. Initialize(slot) - Initialize connection (BEFORE EVERY OPERATION!)
    /// 3. BeginTransactionML(slot) - Lock card to prevent disconnect
    /// 4. [perform operation]
    /// 5. EndTransactionML(slot) - Release lock (in finally!)
    /// 6. FinalizeML(slot) - When done or card removed
    /// </summary>
    class Program
    {
        private static int _currentSlot = -1;
        private static bool _initialized = false;
        private static StreamWriter _logWriter;
        private static readonly object _lock = new object();

        static void Main(string[] args)
        {
            // Setup logging
            string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "siae-bridge.log");
            try
            {
                _logWriter = new StreamWriter(logPath, true, Encoding.UTF8) { AutoFlush = true };
            }
            catch
            {
                _logWriter = null;
            }

            Log("════════════════════════════════════════════════════════");
            Log($"SiaeBridge v2.0 starting at {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            Log($"Directory: {AppDomain.CurrentDomain.BaseDirectory}");
            Log($"CLR: {Environment.Version}, OS: {Environment.OSVersion}");
            Log($"64-bit process: {Environment.Is64BitProcess}");

            // Check for libSIAE.dll
            string dllPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "libSIAE.dll");
            if (File.Exists(dllPath))
            {
                var info = new FileInfo(dllPath);
                Log($"✓ libSIAE.dll found: {info.Length} bytes");
            }
            else
            {
                Log("✗ ERROR: libSIAE.dll NOT FOUND!");
                Log($"  Expected at: {dllPath}");
            }

            // Signal ready
            Console.WriteLine("READY");
            Log("Bridge READY - waiting for commands");

            // Command loop
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;

                Log($">> CMD: {line}");

                try
                {
                    string response = ProcessCommand(line);
                    Console.WriteLine(response);
                    Log($"<< RSP: {(response.Length > 200 ? response.Substring(0, 200) + "..." : response)}");
                }
                catch (Exception ex)
                {
                    var error = new { success = false, error = ex.Message, type = ex.GetType().Name };
                    string json = JsonConvert.SerializeObject(error);
                    Console.WriteLine(json);
                    Log($"<< ERR: {ex.Message}");
                }
            }

            Cleanup();
            Log("Bridge shutting down");
        }

        static void Log(string message)
        {
            try
            {
                string line = $"[{DateTime.Now:HH:mm:ss.fff}] {message}";
                _logWriter?.WriteLine(line);
                Console.Error.WriteLine(line); // Also to stderr for Electron
            }
            catch { }
        }

        static string ProcessCommand(string command)
        {
            if (command == "EXIT")
            {
                Cleanup();
                Environment.Exit(0);
            }

            if (command == "PING")
            {
                return JsonConvert.SerializeObject(new { success = true, message = "PONG" });
            }

            if (command == "CHECK_READER")
            {
                return CheckReader();
            }

            if (command == "READ_CARD")
            {
                return ReadCard();
            }

            if (command.StartsWith("COMPUTE_SIGILLO:"))
            {
                string jsonData = command.Substring("COMPUTE_SIGILLO:".Length);
                return ComputeSigillo(jsonData);
            }

            if (command == "STATUS")
            {
                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    slot = _currentSlot,
                    initialized = _initialized
                });
            }

            return JsonConvert.SerializeObject(new { success = false, error = $"Unknown command: {command}" });
        }

        /// <summary>
        /// Check for reader and card presence
        /// </summary>
        static string CheckReader()
        {
            lock (_lock)
            {
                try
                {
                    Log("CheckReader: Scanning slots...");

                    // Scan for card in slots 0-15
                    int foundSlot = -1;
                    for (int slot = 0; slot < 16; slot++)
                    {
                        try
                        {
                            int result = LibSiae.isCardIn(slot);
                            if (result == 1)
                            {
                                foundSlot = slot;
                                Log($"  ✓ Card found in slot {slot}");
                                break;
                            }
                        }
                        catch (DllNotFoundException)
                        {
                            Log("  ✗ libSIAE.dll not found!");
                            return JsonConvert.SerializeObject(new
                            {
                                success = false,
                                error = "libSIAE.dll non trovata",
                                readerConnected = false,
                                cardPresent = false
                            });
                        }
                        catch
                        {
                            break; // No more readers
                        }
                    }

                    if (foundSlot == -1)
                    {
                        // No card found - cleanup if we were initialized
                        if (_initialized && _currentSlot >= 0)
                        {
                            Log($"  Card removed from slot {_currentSlot}, finalizing...");
                            try { LibSiae.FinalizeML(_currentSlot); } catch { }
                            _initialized = false;
                        }
                        _currentSlot = -1;

                        return JsonConvert.SerializeObject(new
                        {
                            success = true,
                            readerConnected = true,
                            cardPresent = false,
                            message = "Lettore connesso - inserire la carta SIAE"
                        });
                    }

                    // Card found - initialize if needed or slot changed
                    if (!_initialized || _currentSlot != foundSlot)
                    {
                        if (_initialized && _currentSlot >= 0 && _currentSlot != foundSlot)
                        {
                            Log($"  Slot changed {_currentSlot} -> {foundSlot}, finalizing old...");
                            try { LibSiae.FinalizeML(_currentSlot); } catch { }
                        }

                        _currentSlot = foundSlot;
                        Log($"  Initializing slot {foundSlot}...");
                        
                        int initResult = LibSiae.Initialize(foundSlot);
                        Log($"  Initialize result: {initResult} ({LibSiae.GetErrorMessage(initResult)})");

                        if (initResult == LibSiae.C_OK || initResult == LibSiae.C_ALREADY_INITIALIZED)
                        {
                            _initialized = true;
                        }
                        else
                        {
                            return JsonConvert.SerializeObject(new
                            {
                                success = false,
                                readerConnected = true,
                                cardPresent = true,
                                error = $"Inizializzazione fallita: {LibSiae.GetErrorMessage(initResult)}"
                            });
                        }
                    }

                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        readerConnected = true,
                        cardPresent = true,
                        slot = foundSlot,
                        initialized = _initialized,
                        message = "Carta SIAE rilevata e inizializzata"
                    });
                }
                catch (Exception ex)
                {
                    Log($"CheckReader error: {ex.Message}");
                    return JsonConvert.SerializeObject(new
                    {
                        success = false,
                        error = ex.Message,
                        readerConnected = false,
                        cardPresent = false
                    });
                }
            }
        }

        /// <summary>
        /// Read card information with proper transaction handling
        /// </summary>
        static string ReadCard()
        {
            lock (_lock)
            {
                int slot = _currentSlot;
                bool inTransaction = false;

                try
                {
                    Log($"ReadCard: slot={slot}, initialized={_initialized}");

                    // Step 1: Verify card is present
                    if (LibSiae.isCardIn(slot) != 1)
                    {
                        Log("  Card not present!");
                        _initialized = false;
                        _currentSlot = -1;
                        return JsonConvert.SerializeObject(new
                        {
                            success = false,
                            error = "Carta non presente - reinserire"
                        });
                    }

                    // Step 2: Initialize (MUST be called before every operation!)
                    Log("  Initialize...");
                    int initResult = LibSiae.Initialize(slot);
                    Log($"  Initialize: {initResult}");
                    if (initResult != LibSiae.C_OK && initResult != LibSiae.C_ALREADY_INITIALIZED)
                    {
                        return JsonConvert.SerializeObject(new
                        {
                            success = false,
                            error = $"Init failed: {LibSiae.GetErrorMessage(initResult)}"
                        });
                    }
                    _initialized = true;

                    // Step 3: Begin transaction (CRITICAL - prevents reader disconnect!)
                    Log("  BeginTransactionML...");
                    int txResult = LibSiae.BeginTransactionML(slot);
                    Log($"  BeginTransactionML: {txResult}");
                    if (txResult != LibSiae.C_OK)
                    {
                        return JsonConvert.SerializeObject(new
                        {
                            success = false,
                            error = $"Transaction failed: {LibSiae.GetErrorMessage(txResult)}"
                        });
                    }
                    inTransaction = true;

                    // Step 4: Read card data
                    byte[] serial = new byte[8];
                    int snResult = LibSiae.GetSNML(serial, slot);
                    Log($"  GetSNML: {snResult}");
                    if (snResult != LibSiae.C_OK)
                    {
                        return JsonConvert.SerializeObject(new
                        {
                            success = false,
                            error = $"Read SN failed: {LibSiae.GetErrorMessage(snResult)}"
                        });
                    }

                    uint counter = 0;
                    int cntResult = LibSiae.ReadCounterML(ref counter, slot);
                    Log($"  ReadCounterML: {cntResult}, value={counter}");

                    uint balance = 0;
                    int balResult = LibSiae.ReadBalanceML(ref balance, slot);
                    Log($"  ReadBalanceML: {balResult}, value={balance}");

                    byte keyId = LibSiae.GetKeyIDML(slot);
                    Log($"  KeyID: {keyId}");

                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        serialNumber = LibSiae.BytesToHex(serial),
                        counter = counter,
                        balance = balance,
                        keyId = (int)keyId,
                        slot = slot
                    });
                }
                catch (Exception ex)
                {
                    Log($"ReadCard error: {ex.Message}");
                    return JsonConvert.SerializeObject(new
                    {
                        success = false,
                        error = ex.Message
                    });
                }
                finally
                {
                    // Step 5: ALWAYS end transaction in finally!
                    if (inTransaction)
                    {
                        Log("  EndTransactionML (finally)...");
                        try { LibSiae.EndTransactionML(slot); }
                        catch (Exception ex) { Log($"  EndTransaction error: {ex.Message}"); }
                    }
                }
            }
        }

        /// <summary>
        /// Compute fiscal seal with proper transaction handling
        /// </summary>
        static string ComputeSigillo(string jsonData)
        {
            lock (_lock)
            {
                int slot = _currentSlot;
                bool inTransaction = false;

                try
                {
                    Log($"ComputeSigillo: {jsonData}");
                    var request = JsonConvert.DeserializeObject<SigilloRequest>(jsonData);

                    // Step 1: Verify card
                    if (LibSiae.isCardIn(slot) != 1)
                    {
                        _initialized = false;
                        _currentSlot = -1;
                        return JsonConvert.SerializeObject(new
                        {
                            success = false,
                            error = "Carta non presente"
                        });
                    }

                    // Step 2: Initialize
                    Log("  Initialize...");
                    int initResult = LibSiae.Initialize(slot);
                    if (initResult != LibSiae.C_OK && initResult != LibSiae.C_ALREADY_INITIALIZED)
                    {
                        return JsonConvert.SerializeObject(new
                        {
                            success = false,
                            error = $"Init: {LibSiae.GetErrorMessage(initResult)}"
                        });
                    }
                    _initialized = true;

                    // Step 3: Begin transaction
                    Log("  BeginTransactionML...");
                    int txResult = LibSiae.BeginTransactionML(slot);
                    if (txResult != LibSiae.C_OK)
                    {
                        return JsonConvert.SerializeObject(new
                        {
                            success = false,
                            error = $"Transaction: {LibSiae.GetErrorMessage(txResult)}"
                        });
                    }
                    inTransaction = true;

                    // Step 4: Compute sigillo
                    DateTime dt = request.dateTime ?? DateTime.Now;
                    byte[] dataOra = LibSiae.DateTimeToBCD(dt);
                    uint prezzo = (uint)Math.Round(request.price * 100);

                    Log($"  DateTime: {dt:yyyy-MM-dd HH:mm}, Price: {prezzo} cents");

                    byte[] serialNumber = new byte[8];
                    byte[] mac = new byte[8];
                    uint counter = 0;

                    int result = LibSiae.ComputeSigilloML(dataOra, prezzo, serialNumber, mac, ref counter, slot);
                    Log($"  ComputeSigilloML: {result}");

                    if (result != LibSiae.C_OK)
                    {
                        return JsonConvert.SerializeObject(new
                        {
                            success = false,
                            error = $"Sigillo: {LibSiae.GetErrorMessage(result)}"
                        });
                    }

                    return JsonConvert.SerializeObject(new
                    {
                        success = true,
                        sigillo = new
                        {
                            serialNumber = LibSiae.BytesToHex(serialNumber),
                            mac = LibSiae.BytesToHex(mac),
                            counter = counter,
                            dateTime = dt.ToString("yyyy-MM-dd HH:mm"),
                            price = request.price
                        }
                    });
                }
                catch (Exception ex)
                {
                    Log($"ComputeSigillo error: {ex.Message}");
                    return JsonConvert.SerializeObject(new
                    {
                        success = false,
                        error = ex.Message
                    });
                }
                finally
                {
                    if (inTransaction)
                    {
                        Log("  EndTransactionML (finally)...");
                        try { LibSiae.EndTransactionML(slot); }
                        catch { }
                    }
                }
            }
        }

        static void Cleanup()
        {
            lock (_lock)
            {
                try
                {
                    if (_initialized && _currentSlot >= 0)
                    {
                        Log($"Cleanup: FinalizeML slot {_currentSlot}");
                        LibSiae.FinalizeML(_currentSlot);
                    }
                }
                catch { }
                finally
                {
                    _initialized = false;
                    _currentSlot = -1;
                }
            }
        }

        class SigilloRequest
        {
            public decimal price { get; set; }
            public DateTime? dateTime { get; set; }
        }
    }
}
