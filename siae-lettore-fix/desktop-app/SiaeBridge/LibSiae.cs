using System;
using System.Runtime.InteropServices;
using System.Text;

namespace SiaeBridge
{
    /// <summary>
    /// P/Invoke wrapper for libSIAE.dll - SIAE smart card library
    /// IMPORTANT: Always use ML (Multi-Lector) variants with slot parameter!
    /// Sequence: Initialize(slot) → BeginTransactionML(slot) → operation → EndTransactionML(slot)
    /// </summary>
    public static class LibSiae
    {
        private const string DLL_NAME = "libSIAE.dll";

        #region Error Codes
        public const int C_OK = 0x0000;
        public const int C_CONTEXT_ERROR = 0x0001;
        public const int C_NOT_INITIALIZED = 0x0002;
        public const int C_ALREADY_INITIALIZED = 0x0003;
        public const int C_NO_CARD = 0x0004;
        public const int C_UNKNOWN_CARD = 0x0005;
        public const int C_WRONG_LENGTH = 0x6282;
        public const int C_WRONG_TYPE = 0x6981;
        public const int C_NOT_AUTHORIZED = 0x6982;
        public const int C_PIN_BLOCKED = 0x6983;
        public const int C_WRONG_DATA = 0x6A80;
        public const int C_FILE_NOT_FOUND = 0x6A82;
        public const int C_RECORD_NOT_FOUND = 0x6A83;
        public const int C_WRONG_LEN = 0x6A85;
        public const int C_UNKNOWN_OBJECT = 0x6A88;
        public const int C_ALREADY_EXISTS = 0x6A89;
        public const int C_GENERIC_ERROR = 0xFFFF;
        #endregion

        #region Initialization & Status - USE THESE!
        
        /// <summary>
        /// Check if card is present in specified slot (0-15)
        /// Returns 1 if card present, 0 if not
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int isCardIn(int nSlot);

        /// <summary>
        /// Check if library is initialized for any slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int IsInitialized();

        /// <summary>
        /// Initialize connection to card in specified slot
        /// MUST be called before any card operation!
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Initialize(int nSlot);

        /// <summary>
        /// Finalize (close) connection for specific slot
        /// Call when card is removed or on cleanup
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int FinalizeML(int nSlot);

        /// <summary>
        /// Finalize all connections (global)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Finalize();
        
        #endregion

        #region Transaction Control - CRITICAL FOR PREVENTING READER DISCONNECT!
        
        /// <summary>
        /// Begin exclusive transaction with card in specified slot
        /// MUST wrap all card operations to prevent reader reset!
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int BeginTransactionML(int nSlot);

        /// <summary>
        /// End transaction for specified slot
        /// MUST be called in finally block after BeginTransactionML!
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int EndTransactionML(int nSlot);

        /// <summary>
        /// Begin transaction (global - avoid using this)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int BeginTransaction();

        /// <summary>
        /// End transaction (global - avoid using this)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int EndTransaction();
        
        #endregion

        #region Card Information - ML versions
        
        /// <summary>
        /// Get card serial number (8 bytes) for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetSNML(byte[] serial, int nSlot);

        /// <summary>
        /// Get serial number (global - avoid)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetSN(byte[] serial);

        /// <summary>
        /// Read counter for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadCounterML(ref uint value, int nSlot);

        /// <summary>
        /// Read counter (global)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadCounter(ref uint value);

        /// <summary>
        /// Read balance for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadBalanceML(ref uint value, int nSlot);

        /// <summary>
        /// Read balance (global)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadBalance(ref uint value);

        /// <summary>
        /// Get Key ID for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern byte GetKeyIDML(int nSlot);

        /// <summary>
        /// Get Key ID (global)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern byte GetKeyID();
        
        #endregion

        #region Sigillo (Fiscal Seal) - ML versions
        
        /// <summary>
        /// Compute fiscal seal for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ComputeSigilloML(byte[] dataOra, uint prezzo, byte[] serialNumber, byte[] mac, ref uint counter, int nSlot);

        /// <summary>
        /// Compute fiscal seal (global)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ComputeSigillo(byte[] dataOra, uint prezzo, byte[] serialNumber, byte[] mac, ref uint counter);

        /// <summary>
        /// Compute sigillo extended for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ComputeSigilloExML(byte[] dataOra, uint prezzo, byte[] mac, ref uint counter, int nSlot);

        /// <summary>
        /// Fast sigillo for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ComputeSigilloFastML(byte[] dataOra, uint prezzo, byte[] serialNumber, byte[] mac, ref uint counter, int nSlot);
        
        #endregion

        #region Certificate Functions - ML versions
        
        /// <summary>
        /// Get card certificate for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetCertificateML(byte[] cert, ref int dim, int nSlot);

        /// <summary>
        /// Get CA certificate for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetCACertificateML(byte[] cert, ref int dim, int nSlot);

        /// <summary>
        /// Get SIAE certificate for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetSIAECertificateML(byte[] cert, ref int dim, int nSlot);
        
        #endregion

        #region PIN Functions - ML versions
        
        /// <summary>
        /// Verify PIN for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int VerifyPINML(int nPIN, string pin, int nSlot);

        /// <summary>
        /// Change PIN for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int ChangePINML(int nPIN, string oldPin, string newPin, int nSlot);

        /// <summary>
        /// Unblock PIN for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int UnblockPINML(int nPIN, string puk, string newPin, int nSlot);
        
        #endregion

        #region Cryptographic Functions - ML versions
        
        /// <summary>
        /// Sign data for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int SignML(int keyIndex, byte[] toSign, byte[] signed, int nSlot);

        /// <summary>
        /// Hash data (SHA1=1, MD5=2)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Hash(int mechanism, byte[] toHash, int len, byte[] hashed);

        /// <summary>
        /// Apply PKCS#1 padding to hash for RSA signature (output 128 bytes)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Padding(byte[] toPad, int len, byte[] padded);
        
        #endregion

        #region File Operations - ML versions
        
        /// <summary>
        /// Select file for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int SelectML(ushort fid, int nSlot);

        /// <summary>
        /// Read binary for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadBinaryML(ushort offset, byte[] buffer, ref int len, int nSlot);

        /// <summary>
        /// Read record for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadRecordML(int nRec, byte[] buffer, ref int len, int nSlot);
        
        #endregion

        #region Helper Methods
        
        public static string GetErrorMessage(int errorCode)
        {
            switch (errorCode)
            {
                case C_OK: return "OK";
                case C_CONTEXT_ERROR: return "Errore contesto PC/SC";
                case C_NOT_INITIALIZED: return "Non inizializzato - chiamare Initialize()";
                case C_ALREADY_INITIALIZED: return "Già inizializzato";
                case C_NO_CARD: return "Carta non presente";
                case C_UNKNOWN_CARD: return "Carta non riconosciuta (non SIAE)";
                case C_WRONG_LENGTH: return "Lunghezza dati errata";
                case C_WRONG_TYPE: return "Tipo file errato";
                case C_NOT_AUTHORIZED: return "Non autorizzato - PIN errato?";
                case C_PIN_BLOCKED: return "PIN bloccato";
                case C_WRONG_DATA: return "Dati errati";
                case C_FILE_NOT_FOUND: return "File non trovato sulla carta";
                case C_RECORD_NOT_FOUND: return "Record non trovato";
                case C_WRONG_LEN: return "Lunghezza parametro errata";
                case C_UNKNOWN_OBJECT: return "Oggetto sconosciuto";
                case C_ALREADY_EXISTS: return "Elemento già esistente";
                case C_GENERIC_ERROR: return "Errore generico";
                default: return $"Errore 0x{errorCode:X4}";
            }
        }

        /// <summary>
        /// Convert DateTime to SIAE BCD format (YYMMDDHHmm - 5 bytes)
        /// </summary>
        public static byte[] DateTimeToBCD(DateTime dt)
        {
            byte[] bcd = new byte[5];
            int year = dt.Year % 100;
            bcd[0] = (byte)(((year / 10) << 4) | (year % 10));
            bcd[1] = (byte)(((dt.Month / 10) << 4) | (dt.Month % 10));
            bcd[2] = (byte)(((dt.Day / 10) << 4) | (dt.Day % 10));
            bcd[3] = (byte)(((dt.Hour / 10) << 4) | (dt.Hour % 10));
            bcd[4] = (byte)(((dt.Minute / 10) << 4) | (dt.Minute % 10));
            return bcd;
        }

        public static string BytesToHex(byte[] bytes)
        {
            if (bytes == null) return "";
            StringBuilder sb = new StringBuilder(bytes.Length * 2);
            foreach (byte b in bytes)
                sb.AppendFormat("{0:X2}", b);
            return sb.ToString();
        }
        
        #endregion
    }
}
