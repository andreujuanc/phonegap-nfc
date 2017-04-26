//*********************************************************
//
// Copyright (c) Microsoft. All rights reserved.
// This code is licensed under the MIT License (MIT).
// THIS CODE IS PROVIDED *AS IS* WITHOUT WARRANTY OF
// ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ANY
// IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR
// PURPOSE, MERCHANTABILITY, OR NON-INFRINGEMENT.
//
//*********************************************************

using System;
using System.Threading.Tasks;
using Windows.Devices.SmartCards;
using Windows.Storage.Streams;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Devices.Enumeration;
using System.Linq;
using System.Diagnostics;
using System.Collections.Generic;
using Windows.Foundation;

namespace Pcsc
{
    public static class SmartCardConnectionExtension
    {
        /// <summary>
        /// Extension method to SmartCardConnection class similar to Transmit asyc method, however it accepts PCSC SDK commands.
        /// </summary>
        /// <param name="apduCommand">
        /// APDU command object to send to the ICC
        /// </param>
        /// <param name="connection">
        /// SmartCardConnection object
        /// </param>
        /// <returns>APDU response object of type defined by the APDU command object</returns>
        internal static IAsyncOperation<Iso7816.ApduResponse> TransceiveAsync(this SmartCardConnection connection, Iso7816.ApduCommand apduCommand)
        {
            return AsyncInfo.Run(async (cancel) =>
            {
                Iso7816.ApduResponse apduRes = Activator.CreateInstance(apduCommand.ApduResponseType) as Iso7816.ApduResponse;

                IBuffer responseBuf = await connection.TransmitAsync(apduCommand.GetBuffer());

                apduRes.ExtractResponse(responseBuf);

                return apduRes;
            });
        }

        /// <summary>
        /// Extension method to SmartCardConnection class to perform a transparent exchange to the ICC
        /// </summary>
        /// <param name="connection">
        /// SmartCardConnection object
        /// </param>
        /// <param name="commandData">
        /// Command object to send to the ICC
        /// </param>
        /// <returns>Response received from the ICC</returns>
        public static Windows.Foundation.IAsyncOperation<IEnumerable<byte>> TransparentExchangeAsync(this SmartCardConnection connection, [ReadOnlyArray] byte[] commandData)
        {
            return AsyncInfo.Run<IEnumerable<byte>>(async (cancel) =>
            {
                byte[] responseData = null;
                ManageSessionResponse apduRes  = await TransceiveAsync(connection, new ManageSession(new byte[2] { (byte)ManageSession.DataObjectType.StartTransparentSession, 0x00 })) as ManageSessionResponse;

                if (!apduRes.SucceededManaged)
                {
                    throw new Exception("Failure to start transparent session, " + apduRes.ToString());
                }

                using (DataWriter dataWriter = new DataWriter())
                {
                    dataWriter.WriteByte((byte)TransparentExchange.DataObjectType.Transceive);
                    dataWriter.WriteByte((byte)commandData.Length);
                    dataWriter.WriteBytes(commandData);

                    var task2 = TransceiveAsync(connection, new TransparentExchange(dataWriter.DetachBuffer().ToArray()));
                    TransparentExchangeResponse apduRes1 = task2.GetResults() as TransparentExchangeResponse;

                    if (!apduRes1.SucceededTransparent)
                    {
                        throw new Exception("Failure transceive with card, " + apduRes1.ToString());
                    }

                    responseData = apduRes1.IccResponse;
                }

                var task3 = TransceiveAsync(connection, new ManageSession(new byte[2] { (byte)ManageSession.DataObjectType.EndTransparentSession, 0x00 }));
                
                ManageSessionResponse apduRes2 = task3.GetResults() as ManageSessionResponse;
                if (!apduRes2.SucceededManaged)
                {
                    throw new Exception("Failure to end transparent session, " + apduRes2.ToString());
                }

                return responseData;
            });
                
        }
    }

    internal class  SmartCardReaderUtils
    {
        /// <summary>
        /// Checks whether the device supports smart card reader mode
        /// </summary>
        /// <returns>None</returns>
        public static async Task<DeviceInformation> GetFirstSmartCardReaderInfo(SmartCardReaderKind readerKind = SmartCardReaderKind.Any)
        {
            // Check if the SmartCardConnection API exists on this currently running SKU of Windows
            if (!Windows.Foundation.Metadata.ApiInformation.IsTypePresent("Windows.Devices.SmartCards.SmartCardConnection"))
            {
                // This SKU of Windows does not support NFC card reading, only desktop and phones/mobile devices support NFC card reading
                return null;
            }

            // Device selector string is from SmartCardReader.GetDeviceSelector(SmartCardReaderKind.Nfc) except that we remove the conditional
            // about the interface being enabled, since we want to get the device object regardless of whether the user turned it off in the CPL
            string query = "System.Devices.InterfaceClassGuid:=\"{DEEBE6AD-9E01-47E2-A3B2-A66AA2C036C9}\"";
            //if (readerKind != SmartCardReaderKind.Any)
            //{
            //    query += " AND System.Devices.SmartCards.ReaderKind:=" + (int)readerKind;
            //}

            DeviceInformationCollection devices = await DeviceInformation.FindAllAsync(query);
            if (devices.Count == 0) {
                devices = await DeviceInformation.FindAllAsync("System.Devices.InterfaceClassGuid:=\"{9a2fc585-7316-46f1-9577-500920304f9d}\""); 
            }
            // There is a bug on some devices that were updated to WP8.1 where an NFC SmartCardReader is
            // enumerated despite that the device does not support it. As a workaround, we can do an additonal check
            // to ensure the device truly does support it.
            var workaroundDetect = await DeviceInformation.FindAllAsync("System.Devices.InterfaceClassGuid:=\"{50DD5230-BA8A-11D1-BF5D-0000F805F530}\"");

            if (workaroundDetect.Count == 0 || devices.Count == 0)
            {
                // Not supported
                if (readerKind == SmartCardReaderKind.Any)
                {
                    query = DeviceInformation.GetAqsFilterFromDeviceClass(DeviceClass.ImageScanner);
                    workaroundDetect = await DeviceInformation.FindAllAsync(query);
                    if (workaroundDetect.Count == 0)
                    {

                        workaroundDetect = await DeviceInformation.FindAllAsync();
                        if (workaroundDetect.Count == 0) return null;
                        foreach (var item in workaroundDetect)
                        {
                            if (item.Name.ToLower().Contains("NPX".ToLower())
                                || item.Name.ToLower().Contains("Proximity".ToLower())
                                || item.Name.ToLower().Contains("Near".ToLower()))
                            {
                                return (from d in workaroundDetect
                                        where d.IsEnabled
                                        orderby d.IsDefault descending
                                        select d).FirstOrDefault();
                            }
                        }
                    };

                }

            }
            else if(devices.Count == 0 && workaroundDetect.Count > 0) {
                devices = workaroundDetect;
            }
            // Smart card reader supported, but may be disabled
            return (from d in devices
                          where d.IsEnabled
                          orderby d.IsDefault descending
                          select d).FirstOrDefault();
        }
    }
}
