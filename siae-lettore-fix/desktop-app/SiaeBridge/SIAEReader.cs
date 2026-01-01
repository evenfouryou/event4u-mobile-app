using System;
using System.Runtime.InteropServices;

public class SIAEReader
{
    [DllImport("libSIAE.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern bool siae_init();

    [DllImport("libSIAE.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern bool siae_reader_connected();

    [DllImport("libSIAE.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern bool siae_card_present();

    [DllImport("libSIAE.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int siae_get_atr(byte[] buffer, int length);

    public SIAEReader()
    {
        siae_init();
    }

    public bool IsReaderConnected()
    {
        return siae_reader_connected();
    }

    public bool IsCardPresent()
    {
        return siae_card_present();
    }

    public byte[] GetATR()
    {
        byte[] buffer = new byte[64];
        int len = siae_get_atr(buffer, buffer.Length);

        if (len <= 0)
            return null;

        byte[] result = new byte[len];
        Array.Copy(buffer, result, len);
        return result;
    }
}
