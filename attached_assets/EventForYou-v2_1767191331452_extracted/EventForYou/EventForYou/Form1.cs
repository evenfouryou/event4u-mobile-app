using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Timers;
using System.Windows.Forms;

namespace EventForYou
{
    using Newtonsoft.Json;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.Globalization;
    using System.Net;
    using System.Net.Http;
    using System.Net.Http.Headers;
    using System.Runtime.InteropServices.ComTypes;

    public partial class Form1 : Form
    {
        private static System.Timers.Timer _timer;
        private static System.Timers.Timer dailyTimer;
        private static System.Timers.Timer monthlyTimer;
        private static System.Timers.Timer _connect_tm;
        private static bool _isProcessing;
        private static bool _isProcessingConnect;
        private int currentPage = 1;
        private const int pageSize = 3; // Matching your API's default
        private bool hasMorePages = true;

        //[DllImport("D:\\sajjad\\EventForYou\\EventForYou\\bin\\Debug\\libSIAE.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        //public static extern int VerifyPIN(string pin); // Corrected signature to match usage in C#
        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int VerifyPIN(int nPIN, string pin);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int Initialize(int Slot);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int ComputeSigillo(
            byte[] Data_Ora,    //
            uint Prezzo,        // 
            byte[] SN,          //
            byte[] mac,         // 
            ref uint cnt        //
        );

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int ChangePIN(int nPIN, string Oldpin, string Newpin);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int UnblockPIN(int nPIN, string Puk, string Newpin);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int GetCertificate(byte[] cert, ref int dim);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int Finalize();

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int isCardIn(int Slot);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int GetSN(byte[] serial);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int VerifyPINML(int nPIN, string pin, int nSlot);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadCounter(ref uint value);
        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern byte GetKeyID();

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int Hash(int mec, byte[] toHash, int len, byte[] hashed);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int Padding(byte[] toPad, int len, byte[] padded);

        [DllImport("libSIAE.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int Sign(byte keyId, byte[] toSign, byte[] signedData);

        public Form1()
        {
            InitializeComponent();
            CheckCardAndInitialize();

        }

        /// <summary>
        /// Helper per leggere il numero seriale della carta.
        /// </summary>
        private string GetCardSerial()
        {
            byte[] sn = new byte[8];
            int snResult = GetSN(sn);
            if (snResult != 0) return "UNKNOWN";
            return BitConverter.ToString(sn).Replace("-", "");
        }

        private void CheckCardAndInitialize()
        {
            try
            {
                // Step 1: Check if a card is present
                if (isCardIn(0) == 0)
                {
                    MessageBox.Show("No smart card detected in the reader.", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // Step 2: Attempt to initialize the card
                int rc = Initialize(0);

                // Step 3: Handle the result
                switch (rc)
                {
                    case 0: // C_OK
                        MessageBox.Show($"Smart card initialized successfully! {rc}", "Success",
                            MessageBoxButtons.OK, MessageBoxIcon.Information);
                        return;

                    case 1: // C_CONTEXT_ERROR
                        MessageBox.Show("PC/SC context error. Check if the Smart Card service is running.",
                            "Critical Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return;

                    case 2: // C_NOT_INITIALIZED
                        MessageBox.Show("Failed to initialize the card. Possible reasons:\n\n" +
                                       "1. Card is not properly inserted.\n" +
                                       "2. The card is not a valid SIAE card.\n" +
                                       "3. Driver/reader compatibility issue.",
                            "Initialization Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        return;
                    case 3: // C_OK
                        MessageBox.Show($"Smart card initialized successfully! {rc}", "Success",
                            MessageBoxButtons.OK, MessageBoxIcon.Information);
                        return;
                    case 4: // C_UNKNOWN_CARD
                        MessageBox.Show("No card.",
                            "Card Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return;
                    case 5: // C_UNKNOWN_CARD
                        MessageBox.Show("Unsupported card type. Only SIAE cards are allowed.",
                            "Card Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return;
                    default:
                        MessageBox.Show($"Unknown error (Code: {rc})",
                            "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        break;
                }

                string sn = GetCardSerial();
                if (sn == "UNKNOWN")
                {
                    MessageBox.Show("No serial card detected in the reader.", "Error",
                       MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                else
                {
                    MessageBox.Show($"serial card is {sn}.", "Success",
                      MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Initialize Errore: {ex.Message}", "Errore",
                                               MessageBoxButtons.OKCancel, MessageBoxIcon.Error);

            }


        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            Finalize(); // Release the card connection
        }

        private void verifyPinBtnClick(object sender, EventArgs e)
        {
            try
            {
                byte[] sn = new byte[8];
                int snResult = GetSN(sn);
                if (snResult == 0)
                {
                    this.serialTxt.Text = "Serial" + BitConverter.ToString(sn).Replace("-", "");
                }
                else
                {
                    throw new Exception($"GetSN: {snResult:X4}");
                }

                byte[] cert = new byte[4096];
                int len = cert.Length;
                int rc2 = GetCertificate(cert, ref len);
                if (rc2 == 0)
                {
                    this.certificateTxt.Text = "GetCertificate :" + BitConverter.ToString(cert).Replace("-", "");
                }
                else
                {
                    throw new Exception($"GetCertificate: {rc2:X4}");
                }


                int pinNumber = Int32.Parse(pinCode.Text); // This should be the actual PIN number you want to verify
                string pin = pinValue.Text; // The actual PIN value
                int result = VerifyPIN(pinNumber, pin);
                // This now matches the corrected signature
                if (result != 0)
                {
                    throw new Exception($"Get VerifyPIN: {result}");
                }
                else
                {
                    MessageBox.Show($"Verify {pin} success", "Success",
                                                   MessageBoxButtons.OK, MessageBoxIcon.Information);
                }

            }
            catch (Exception ex)
            {
                MessageBox.Show($"Verify Pin Errore: {ex.Message}", "Errore",
                                               MessageBoxButtons.OKCancel, MessageBoxIcon.Error);

            }
        }



        private byte[] ParseDateTimeToBytes(string isoDateTime)
        {
            try
            {
                // 1. Parse the ISO 8601 format with UTC timezone
                DateTime utcDate = DateTime.Parse(isoDateTime, null, System.Globalization.DateTimeStyles.RoundtripKind);

                // 2. Convert to local time if needed (remove this line if you want to keep UTC)
                DateTime inputDate = utcDate.ToLocalTime();

                // Alternative: If you want to keep as UTC but just remove the timezone info
                // DateTime inputDate = DateTime.SpecifyKind(utcDate, DateTimeKind.Unspecified);

                // 3. Create the byte array
                byte[] dateTimeBytes = new byte[8];
                dateTimeBytes[0] = (byte)(inputDate.Year % 100);  // Last 2 digits of year
                dateTimeBytes[1] = (byte)inputDate.Month;         // Month (1-12)
                dateTimeBytes[2] = (byte)inputDate.Day;           // Day (1-31)
                dateTimeBytes[3] = (byte)inputDate.Hour;          // Hour (0-23)
                dateTimeBytes[4] = (byte)inputDate.Minute;        // Minute (0-59)
                dateTimeBytes[5] = (byte)inputDate.Second;        // Second (0-59)
                dateTimeBytes[6] = 0;                             // Reserved byte
                dateTimeBytes[7] = 0;

                return dateTimeBytes;
            }
            catch (Exception ex)
            {
                // Handle parsing error
                UpdateStatusLabel($"Error parsing datetime: {ex.Message}");
                return new byte[8]; // Return empty array or handle differently
            }
        }
        private String signTransaction(string updated_at, string txtPriceText)
        {
            try
            {
                UpdateStatusLabel($"222 Sign start: {updated_at}==> {txtPriceText}");
                byte[] sn = new byte[8];
                int snResult = GetSN(sn);
                UpdateStatusLabel(snResult == 0 ?
                    $"SN OK Serial: {BitConverter.ToString(sn).Replace("-", "")}"
                    : $"Errore GetSN: {snResult:X4}");
                byte[] cert = new byte[4096];
                int len = cert.Length;
                int rc2 = GetCertificate(cert, ref len);
                UpdateStatusLabel(rc2 == 0 ? "Certificato presente" : $"Errore certificato: {rc2:X4}");


                var pinCodeText = "1";
                var pinValueText = "75399990";
                var txtCounterText = "1";
                UpdateStatusLabel($"VerifyPIN start: {pinCodeText}==> {pinValueText}");
                int pinNumber = Int32.Parse(pinCodeText); // This should be the actual PIN number you want to verify
                int rc = VerifyPIN(pinNumber, pinValueText);
                if (rc != 0)
                {
                    UpdateStatusLabel($"Error VerifyPIN : {rc:X4}");
                    return "";
                }
                UpdateStatusLabel($"Success VerifyPIN : {rc:X4}");
                // 1. Parse DateTime (from "2025-10-01 12:00:00" to bytes)
                byte[] dateTimeBytes = ParseDateTimeToBytes(updated_at);
                UpdateStatusLabel($"Success parse updatedat : {dateTimeBytes.ToString()}");
                // 2. Parse Serial Number (HEX string)
                //byte[] serialBytes = HexStringToByteArray(txtSerialNumberHex.Text);
                // 2. Get Serial Number directly from the card
                byte[] serialBytes = new byte[8];
                rc = GetSN(serialBytes); // دریافت شماره سریال از کارت

                if (rc != 0)
                {
                    UpdateStatusLabel($"Error to get serial number: {rc:X4}");
                    return "";
                }
                // 3. Parse Price (decimal)

                decimal priceDecimal = decimal.Parse(txtPriceText, CultureInfo.InvariantCulture);
                uint price = (uint)(priceDecimal * 100);
                // 4. Parse Counter (decimal)
                uint counter = uint.Parse(txtCounterText);

                // 5. Prepare MAC buffer (8 bytes)
                byte[] mac = new byte[8];

                // 6. Call ComputeSigillo
                int result = ComputeSigillo(
                    dateTimeBytes,
                    price,
                    serialBytes,
                    mac,
                    ref counter
                );
                UpdateStatusLabel($"ComputeSigillo: {result}");
                // 7. Show result
                if (result == 0)
                {
                    UpdateStatusLabel($"Success: {BitConverter.ToString(mac)}");

                    return BitConverter.ToString(mac).Replace("-", "");
                }
                else
                {
                    return "";
                }
            }
            catch (Exception ex)
            {
                UpdateStatusLabel($"291 Error sign: {ex.Message}");
                return "";
            }

        }
        private void initConnect()
        {
            this.result.Text = "Send request to connect api";
            if (_connect_tm == null)
            {
                _connect_tm = new System.Timers.Timer(3000);
                _connect_tm.Elapsed += Connect_Timer_Elapsed;
                _connect_tm.AutoReset = true;
            }

            _connect_tm.Start();
        }
        private bool getCheckCardAndInitialize()
        {
            //UpdateStatusLabel("start is connect");
            // Step 1: Check if a card is present
            if (isCardIn(0) == 0)
            {
                UpdateStatusLabel("start is connect is card in false");
                return false;
            }
            // Step 2: Attempt to initialize the card
            //int rc = Initialize(0);
            //UpdateStatusLabel("start is connect init"+rc);

            //// Step 3: Handle the result
            //switch (rc)
            //{
            //    case 0: // C_OK
            //        return true;
            //    case 3: // C_OK
            //        return true;
            //    default:
            //        return false;
            //}
            return true;

        }

        private void connect_Click(object sender, EventArgs e)
        {
            this.result.Text = "Send request to get transaction api";
            if (_timer == null)
            {
                _timer = new System.Timers.Timer(1000);
                _timer.Elapsed += Timer_Elapsed;
                _timer.AutoReset = true;
            }

            _timer.Start();
        }
       
        private async void Timer_Elapsed(object sender, ElapsedEventArgs e)
        {
            if (_isProcessing) return;
            _isProcessing = true;
            try
            {
                UpdateStatusLabel($"Fetching page {currentPage}...");

                var apiResponse = await GetDataFromApi(currentPage, pageSize);

                if (apiResponse?.Transactions?.Data != null && apiResponse.Transactions.Data.Count > 0)
                {
                    // Process the transactions
                    UpdateDataGridView(apiResponse.Transactions.Data);

                    // Update pagination info
                    hasMorePages = apiResponse.Transactions.NextPageUrl != null;
                    currentPage = hasMorePages ? currentPage + 1 : 1;

                    UpdateStatusLabel($"Page {apiResponse.Transactions.CurrentPage} of {apiResponse.Transactions.LastPage} - {apiResponse.Transactions.Total} total items");
                }
            }
            finally
            {
                _isProcessing = false;
            }

            //cal api it is hear

        }
        private async void UpdateDataGridView(List<Transaction> transactions)
        {
            // Create a list to store all signed transaction results
            var transactionResults = new List<TransactionResult>();
            UpdateStatusLabel("\n *****************START Divice****************\n");
            foreach (var transaction in transactions)
            {
                // Call signTransaction for each transaction
                // UpdateStatusLabel($"\n Divice  Call signTransaction for each transaction: update={transaction.UpdatedAt} price={transaction.FinalAmount}");
                string signatureResult = signTransaction(transaction.UpdatedAt, transaction.FinalAmount);
              
                // Add to our results list
                if (signatureResult == null || signatureResult == "" || signatureResult.Length < 1)
                {
                    continue;
                    // break;
                }
                uint counter = 0;
                int result = ReadCounter(ref counter);
                UpdateStatusLabel($"\n ---> id={transaction.Id} siae_id={signatureResult} counter={counter}<----");
                transactionResults.Add(new TransactionResult
                {
                    Id = transaction.Id,
                    SiaeId = signatureResult,
                    TicketNumber = ""+counter,
                });
                // break;
            }
            UpdateStatusLabel($"\n Divice Result: count={transactionResults.Count}");

            UpdateStatusLabel("\n *****************DIVICE END****************\n");
            // Prepare the final payload

            if (transactionResults.Count > 0)
            {
                // Send results back to the same API
                await SendResultsToApi(transactionResults);
            }

        }
        private void UpdateStatusLabel(string message)
        {
            if (richTextBox1.InvokeRequired)
            {
                richTextBox1.Invoke((MethodInvoker)delegate { UpdateStatusLabel(message); });
                return;
            }
            richTextBox1.Text = $"{message} \n {richTextBox1.Text}";
            
            //txt save in file
        }

        private async void Connect_Timer_Elapsed(object sender, ElapsedEventArgs e)
        {
            if (_isProcessingConnect) return;
            _isProcessingConnect = true; 
            bool isConnect = false;
            if (getCheckCardAndInitialize())
            {
                UpdateStatusLabel("Connect successfull");
                isConnect = true;
            }
            else
            {
              UpdateStatusLabel("No smart card detected in the reader");
              MessageBox.Show($"No smart card detected in the reader", "Errore",
                                              MessageBoxButtons.OKCancel, MessageBoxIcon.Error);
               
            }

               
            await SendToConnectApi(isConnect);
            if (!isConnect)
            {
                _isProcessingConnect = true;
            }
        }

        //intial funcation
        private async Task<ApiResponse> GetDataFromApi(int page, int pageSize)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    // Add base address and headers if needed
                    client.BaseAddress = new Uri("https://dev.eventfouryou.com/");
                    client.DefaultRequestHeaders.Accept.Clear();
                    client.DefaultRequestHeaders.Accept.Add(
                        new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

                    // Note: Laravel typically uses 'page' and 'per_page' parameters
                    string url = $"/api/transaction/card/webhook?page={page}&per_page={pageSize}";

                    var response = await client.GetAsync(url);
                    response.EnsureSuccessStatusCode();

                    string responseBody = await response.Content.ReadAsStringAsync();
                    return JsonConvert.DeserializeObject<ApiResponse>(responseBody);
                }
            }
            catch (Exception ex)
            {
                UpdateStatusLabel($"\n API Error: {ex.Message}");
                return null;
            }
        }

        private async Task<bool> SendResultsToApi(List<TransactionResult> results)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    // 1. Set up the client exactly like your curl
                    client.BaseAddress = new Uri("https://dev.eventfouryou.com/");
                    client.DefaultRequestHeaders.Accept.Clear();
                    client.DefaultRequestHeaders.Accept.Add(
                        new MediaTypeWithQualityHeaderValue("application/json"));

                    // 2. Prepare the payload to exactly match your curl example
                    var payload = new
                    {
                        transaction = results
                    };

                    // 3. Serialize with the same settings curl uses
                    var jsonContent = JsonConvert.SerializeObject(payload, new JsonSerializerSettings
                    {
                        NullValueHandling = NullValueHandling.Ignore,
                        Formatting = Formatting.None
                    });

                    var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                    // 4. Log the request for debugging
                    Debug.WriteLine($"Sending: {jsonContent}");

                    // 5. Make the request
                    var response = await client.PostAsync("api/transaction/card/webhook", content);

                    // 6. Handle the response
                    if (response.IsSuccessStatusCode)
                    {
                        var responseBody = await response.Content.ReadAsStringAsync();
                        var responseObj = JsonConvert.DeserializeObject<ApiResponseSave>(responseBody);

                        if (responseObj?.Message == "success")
                        {
                            UpdateStatusLabel("API response: Success");
                            return true;
                        }
                    }
                    else if (response.StatusCode == (HttpStatusCode)422)
                    {
                        // Get detailed error message
                        var errorBody = await response.Content.ReadAsStringAsync();
                        UpdateStatusLabel($"Validation error: {errorBody}");
                        Debug.WriteLine($"422 Error: {errorBody}");
                    }
                    else
                    {
                        UpdateStatusLabel($"API error: {response.StatusCode}");
                    }
                }
            }
            catch (Exception ex)
            {
                UpdateStatusLabel($"Request failed: {ex.Message}");
                Debug.WriteLine($"Exception: {ex}");
            }

            return false;
        }

        private async Task<bool> SendToConnectApi(bool isConnect)
        {
            try
            {
                using (var client = new HttpClient())
                {
                   // UpdateStatusLabel("API Connect response: Success" + isConnect);
                    // 1. Set up the client exactly like your curl
                    client.BaseAddress = new Uri("https://dev.eventfouryou.com/");
                    client.DefaultRequestHeaders.Accept.Clear();
                    client.DefaultRequestHeaders.Accept.Add(
                        new MediaTypeWithQualityHeaderValue("application/json"));

                    // 2. Prepare the payload to exactly match your curl example
                    var payload = new
                    {
                        connect = isConnect
                    };

                    // 3. Serialize with the same settings curl uses
                    var jsonContent = JsonConvert.SerializeObject(payload, new JsonSerializerSettings
                    {
                        NullValueHandling = NullValueHandling.Ignore,
                        Formatting = Formatting.None
                    });

                    var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                    // 4. Log the request for debugging
                    //Debug.WriteLine($"Sending: {jsonContent}");

                    // 5. Make the request
                    var response = await client.PostAsync("api/transaction/card/connect/webhook", content);
                    _isProcessingConnect = false;
                    // 6. Handle the response
                    if (response.IsSuccessStatusCode)
                    {
                        var responseBody = await response.Content.ReadAsStringAsync();
                        var responseObj = JsonConvert.DeserializeObject<ApiResponseConnect>(responseBody);

                        if (responseObj?.Id > 0)
                        {
                            UpdateStatusLabel("API Connect response");
                            return true;
                        }
                    }
                    else if (response.StatusCode == (HttpStatusCode)422)
                    {
                        // Get detailed error message
                        var errorBody = await response.Content.ReadAsStringAsync();
                        UpdateStatusLabel($"Validation error: {errorBody}");
                       // Debug.WriteLine($"422 Error: {errorBody}");
                    }
                    else
                    {
                        UpdateStatusLabel($"API error: {response.StatusCode}");
                    }
                }
            }
            catch (Exception ex)
            {
                _isProcessingConnect = false;
                UpdateStatusLabel($"Request failed: {ex.Message}");
                Debug.WriteLine($"Exception: {ex}");
            }

            return false;
        }



        //startAppBtn
        private void startAppBtn(object sender, EventArgs e)
        {
            initConnect();
        }
        //ReadCounter
        private void readCounterBtnClick(object sender, EventArgs e)
        {
            this.txtCounter.Text += "Counter : 0";
            try
            {
                uint counter = 0;
                int result = ReadCounter(ref counter);
                if (result == 0)
                    this.txtCounter.Text = "Counter : " + counter.ToString();
                else
                    MessageBox.Show("Counter error ", "Error");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"API Error: {ex.Message}");

            }
        }

        private void dayBtnClick(object sender, EventArgs e)
        {

            UpdateStatusLabel($"[daily] start");
            // Daily Timer - runs every day at 04:00
            dailyTimer = new System.Timers.Timer();
            dailyTimer.Elapsed += DailyTimer_Elapsed;
            SetDailyTimer(); // Initial setup
            //daily();
        }

        //Month
        private async void monthBtnClick(object sender, EventArgs e)
        {
            UpdateStatusLabel($"[Monthly] start");
            // y/m/1 00:00
            // Monthly Timer - runs on 1st day of month at 00:00
            monthlyTimer = new System.Timers.Timer();
            monthlyTimer.Elapsed += MonthlyTimer_Elapsed;
            SetMonthlyTimer(); // Initial setup
            //monthly();
        }
        /// <summary>
        /// Firma un file XML (report giornaliero o mensile) con la smart card SIAE
        /// e genera il file .P7M firmato digitalmente.
        /// </summary>
        private async Task<string> SignXmlFileAsync(string getEndpoint,string filename, string type)
        {
            // Define the base address and endpoints for clarity
            string baseApiUrl = "https://dev.eventfouryou.com/api/";
           
            string postEndpoint = "transaction/save/report/webhook";

            try
            {
                // 1. Set up the HttpClient, following the pattern of the example
                using (var client = new HttpClient())
                {
                    client.BaseAddress = new Uri(baseApiUrl);
                    client.DefaultRequestHeaders.Accept.Clear();
                    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                    // --- Part 1: GET the XML file from the API ---
                    UpdateStatusLabel($"[SIGN] Retrieving XML file from API: {getEndpoint}");
                    Debug.WriteLine($"[SIGN] Sending GET request to: {client.BaseAddress}{getEndpoint}");

                    var getResponse = await client.GetAsync(getEndpoint);

                    // Check if the GET request was successful
                    if (getResponse.IsSuccessStatusCode)
                    {
                        // Read the XML content as a byte array
                        byte[] xmlContent = await getResponse.Content.ReadAsByteArrayAsync();
                        UpdateStatusLabel($"[SIGN] XML file successfully retrieved. Size: {xmlContent.Length} bytes.");
                        Debug.WriteLine($"[SIGN] Retrieved {xmlContent.Length} bytes from API.");

                        // --- Part 2: Perform the local signing operations ---
                        // 2.1 Calculate SHA1 hash (code 1 = SHA1)
                        byte[] hashed = new byte[20];
                        int rcHash = Hash(1, xmlContent, xmlContent.Length, hashed);
                        if (rcHash != 0)
                        {
                            UpdateStatusLabel($"[SIGN] Hash Error: {rcHash:X4}");
                            return null;
                        }
                        UpdateStatusLabel($"[SIGN] Hash  Success");

                        // 2.2 Apply PKCS#1 padding to the hash
                        byte[] padded = new byte[128];
                        int rcPad = Padding(hashed, 20, padded);
                        if (rcPad != 0)
                        {
                            UpdateStatusLabel($"[SIGN] Padding Error: {rcPad:X4}");
                            return null;
                        }
                        UpdateStatusLabel($"[SIGN] Padding Suucess");

                        // 2.3 Retrieve Key ID and sign the padded hash
                        byte kid = GetKeyID();
                        byte[] signed = new byte[128];
                        int rcSign = Sign(kid, padded, signed);
                        if (rcSign != 0)
                        {
                            UpdateStatusLabel($"[SIGN] Sign Error: {rcSign:X4}");
                            return null;
                        }

                        // --- Part 3: POST the signed file to the second API ---
                        UpdateStatusLabel($"[SIGN] Preparing to save signed file via API: {postEndpoint}");

                        

                        // 3.2 Convert the signed byte array to a Base64 string for JSON transport
                        string base64Content = Convert.ToBase64String(signed);

                        // 3.3 Prepare the payload to match the required API format
                        var payload = new
                        {
                            path = filename,
                            content = base64Content,
                            type = type
                        };

                        // 3.4 Serialize the payload using Newtonsoft.Json with specific settings
                        var jsonContent = JsonConvert.SerializeObject(payload, new JsonSerializerSettings
                        {
                            NullValueHandling = NullValueHandling.Ignore,
                            Formatting = Formatting.None
                        });
                        //Debug.WriteLine($"[SIGN] Sending to POST API: {jsonContent}");

                        var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                        // 3.5 Make the POST request
                        var postResponse = await client.PostAsync(postEndpoint, httpContent);

                        // 3.6 Handle the POST response
                        if (postResponse.IsSuccessStatusCode)
                        {
                            UpdateStatusLabel($"[SIGN] Signed file successfully saved on the server. Path: {filename}");
                            return filename; // Return the name of the saved file on success
                        }
                        else
                        {
                            // Handle POST failure, including detailed error if available
                            string errorBody = await postResponse.Content.ReadAsStringAsync();
                            UpdateStatusLabel($"[SIGN] API POST Error 823: {postResponse.StatusCode} - {errorBody}");
                            //Debug.WriteLine($"[SIGN] API POST Error: {postResponse.ReasonPhrase}. Body: {errorBody}");
                            return null;
                        }
                    }
                    else
                    {
                        // Handle GET failure
                        UpdateStatusLabel($"[SIGN] API GET Error 831: {getResponse.StatusCode}");
                        //Debug.WriteLine($"[SIGN] API GET Error: {getResponse.ReasonPhrase}");
                        return null;
                    }
                }
            }
            catch (Exception ex)
            {
                // Catch any unexpected exceptions during the process
                UpdateStatusLabel($"[SIGN] Request failed: {ex.Message}");
                //Debug.WriteLine($"[SIGN] Exception: {ex}");
                return null;
            }
        }

        private async void monthly() {
            // This runs at 00:00 on the 1st of each month 
            // Your monthly processing logic here
            UpdateStatusLabel("[monthly] Starting the sign and save process...");
            string getEndpoint = "transaction/monthly/webhook";
            // Call the async function and wait for the result
            // Calculate yesterday's date components
            DateTime yesterday = DateTime.Today.AddMonths(-1);
            string year = yesterday.Year.ToString();
            string month = yesterday.Month.ToString("00");
            // 3.1 Define the name for the file to be saved on the server
           // string signedFileName = "2025/11/monthly_report.P7M";
            string filename = $"{year}/{month}/Report-{month}-{year}.p7m";

            UpdateStatusLabel($"[monthly] filename={filename}");
            string result = await SignXmlFileAsync(getEndpoint, filename, "month");

            if (result != null)
            {
                UpdateStatusLabel($"[monthly] Process completed successfully. Signed file saved as: {result}");
                //  MessageBox.Show($"File signed and saved successfully!\nFilename: {result}", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                UpdateStatusLabel("[monthly] Process failed for monthly report.");
                // MessageBox.Show("The sign and save process failed. Please check the status log for more information.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        private async void daily()
        {
            // This runs at 04:00 every day

            // Access yesterday's date using:
            DateTime yesterday = DateTime.Today.AddDays(-1);
            UpdateStatusLabel($"[daily] Starting the sign and save process...{yesterday}");
            string year = yesterday.Year.ToString();
            string month = yesterday.Month.ToString("00");
            string day = yesterday.Day.ToString("00");
            string getEndpoint = "transaction/daily/webhook";
            string filename = $"{year}/{month}/{day}/Report-{month}-{day}-{year}.p7m";
            UpdateStatusLabel($"[daily] filename={filename}");
            string result = await SignXmlFileAsync(getEndpoint, filename, "daily");

            if (result != null)
            {
                UpdateStatusLabel($"[daily] Process completed successfully. Signed file saved as: {result}");
                //  MessageBox.Show($"File signed and saved successfully!\nFilename: {result}", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                UpdateStatusLabel("[daily] Process failed for daily report.");
                // MessageBox.Show("The sign and save process failed. Please check the status log for more information.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void SetDailyTimer()
        {
            DateTime now = DateTime.Now;
            DateTime nextRun = new DateTime(now.Year, now.Month, now.Day, 4, 0, 0);

            if (now > nextRun)
            {
                nextRun = nextRun.AddDays(1); // Schedule for tomorrow if past 4 AM
            }

            TimeSpan interval = nextRun - now;
            UpdateStatusLabel($"[Daily]  interval.TotalMilliseconds {interval.TotalMilliseconds}");
            dailyTimer.Interval = interval.TotalMilliseconds;
            dailyTimer.Start();
        }

        private void DailyTimer_Elapsed(object sender, ElapsedEventArgs e)
        {
            // Execute daily function
            daily();

            // Reset timer for next day
            SetDailyTimer();
        }

        private void SetMonthlyTimer()
        {
            DateTime now = DateTime.Now;
            DateTime nextRun = new DateTime(now.Year, now.Month, now.Day, 0, 0, 1);

            if (now > nextRun)
            {
                nextRun = nextRun.AddDays(1); // Schedule for tomorrow if past 4 AM
            }
            TimeSpan interval = nextRun - now;
            UpdateStatusLabel($"[Monthly] Call in Day={now.Day}");
            monthlyTimer.Interval = interval.TotalMilliseconds;
            monthlyTimer.Start();
        }

        private void MonthlyTimer_Elapsed(object sender, ElapsedEventArgs e)
        {
            monthlyTimer.Stop();

            UpdateStatusLabel($"[Monthly] Elapsed");
            // Check if today is the first day of the month
            if (DateTime.Now.Day == 1)
            {

                UpdateStatusLabel($"[Monthly] Start call monthly");
                monthly(); // Execute monthly task
            }

            SetMonthlyTimer(); // Reschedule for next day
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            // Clean up timers
            dailyTimer?.Stop();
            dailyTimer?.Dispose();
            monthlyTimer?.Stop();
            monthlyTimer?.Dispose();
            _timer?.Stop();
            _timer?.Dispose();
            _connect_tm?.Stop();
            _connect_tm?.Dispose();
            base.OnFormClosing(e);
        }

        private void stopAppBtn_Click(object sender, EventArgs e)
        {
           
                _timer?.Stop();
                _timer?.Dispose();
           
        }

        private void stopConnectApiBtn_Click(object sender, EventArgs e)
        {
          
                _connect_tm.Stop();
                _connect_tm?.Dispose();
          
        }

        /// 
        ///
    }
    public class TransactionResult
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("siae_id")]
        public string SiaeId { get; set; }

        [JsonProperty("ticket_number")]
        public string TicketNumber { get; set; }
    }
    public class ApiResponseSave
    {
        [JsonProperty("message")]
        public string Message { get; set; }
    }
    public class ApiResponseConnect
    {
        [JsonProperty("id")]
        public int Id { get; set; }
    }
    public class ApiResponse
    {
        [JsonProperty("transactions")]
        public TransactionData Transactions { get; set; }
    }

    public class TransactionData
    {
        [JsonProperty("current_page")]
        public int CurrentPage { get; set; }

        [JsonProperty("data")]
        public List<Transaction> Data { get; set; }

        [JsonProperty("first_page_url")]
        public string FirstPageUrl { get; set; }

        [JsonProperty("from")]
        public int From { get; set; }

        [JsonProperty("last_page")]
        public int LastPage { get; set; }

        [JsonProperty("last_page_url")]
        public string LastPageUrl { get; set; }

        [JsonProperty("links")]
        public List<PaginationLink> Links { get; set; }

        [JsonProperty("next_page_url")]
        public string NextPageUrl { get; set; }

        [JsonProperty("path")]
        public string Path { get; set; }

        [JsonProperty("per_page")]
        public int PerPage { get; set; }

        [JsonProperty("prev_page_url")]
        public string PrevPageUrl { get; set; }

        [JsonProperty("to")]
        public int To { get; set; }

        [JsonProperty("total")]
        public int Total { get; set; }
    }

    public class Transaction
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("final_amount")]
        public string FinalAmount { get; set; }

        [JsonProperty("updated_at")]
        public string UpdatedAt { get; set; }
    }

    public class PaginationLink
    {
        [JsonProperty("url")]
        public string Url { get; set; }

        [JsonProperty("label")]
        public string Label { get; set; }

        [JsonProperty("active")]
        public bool Active { get; set; }
    }
}
