var MifareUltralight =  {
    AccessHandler: function (ScConnection) {
        
        this.connectionObject = ScConnection;

        this.GetUidAsync = function () {
            return this.TransceiveAsync(new MifareUltralight.GetUid())
                .then(function (apduRes) {
                    if (!apduRes.Succeeded()) {
                        throw new Error("Failure getting UID of MIFARE Ultralight card, " + apduRes.ToString());
                    }
                    return apduRes.ResponseData;
                }, function (error) {
                    debugger;
                });
        };

        this.TransceiveAsync = function (apduCommand) {
            var buffer = apduCommand.GetBuffer();
            var cnn = this.connectionObject;
            return new Promise(function (resolve, reject) {
                cnn.transmitAsync(buffer)
                    .then(function (responseBuf) {
                        var apduRes = new apduCommand.ApduResponseType();
                        apduRes.ExtractResponse(responseBuf);
                        return resolve(apduRes);
                    }, function (error) {
                        debugger;
                        return reject(error);
                    });
            });
          
            //internal static IAsyncOperation<Iso7816.ApduResponse> TransceiveAsync(this SmartCardConnection connection, Iso7816.ApduCommand apduCommand) {
            //return AsyncInfo.Run(async (cancel) => {
            //    Iso7816.ApduResponse apduRes = Activator.CreateInstance(apduCommand.ApduResponseType) as Iso7816.ApduResponse;

            //    IBuffer responseBuf = await connection.TransmitAsync(apduCommand.GetBuffer());

            //    apduRes.ExtractResponse(responseBuf);

            //    return apduRes;
            //});
        }
    },
    GetUid: function () {
        GetData.call(this, GetData.GetDataDataType.Uid);
    }

//        public async Task< byte[] > ReadAsync(byte pageAddress)
//        {
//            var apduRes = await connectionObject.TransceiveAsync(new MifareUltralight.Read(pageAddress));

//            if (!apduRes.Succeeded) {
//                throw new Exception("Failure reading MIFARE Ultralight card, " + apduRes.ToString());
//            }

//            return apduRes.ResponseData;
//        }
//                /// <summary>
//                /// Wrapper method write 4 bytes at the pageAddress
//                /// </param name="pageAddress">
//                /// page address to write
//                /// </param>
//                /// byte array of the data to write
//                /// </returns>
//                public async void WriteAsync(byte pageAddress, byte[] data)
//        {
//            if (data.Length != 4) {
//                throw new NotSupportedException();
//            }

//            var apduRes = await connectionObject.TransceiveAsync(new MifareUltralight.Write(pageAddress, ref data));

//            if (!apduRes.Succeeded) {
//                throw new Exception("Failure writing MIFARE Ultralight card, " + apduRes.ToString());
//            }
//        }
//                /// <summary>
//                /// Wrapper method to perform transparent transceive data to the MifareUL card
//                /// </summary>
//                /// <param name="commandData">
//                /// The command to send to the MifareUL card
//                /// </param>
//                /// <returns>
//                /// byte array of the read data
//                /// </returns>
//                public IAsyncOperation < IEnumerable < byte >> TransparentExchangeAsync(byte[] commandData)
//        {
//            return AsyncInfo.Run(async (cancel) => {
//                var responseData = await connectionObject.TransparentExchangeAsync(commandData);

//                return responseData;
//            });
//        }
//                /// <summary>
//                /// Wrapper method get the MifareUL ICC UID
//                /// </summary>
//                /// <returns>
//                /// byte array UID
//                /// </returns>
//                public IAsyncOperation < IEnumerable < byte >> GetUidAsync()
//        {
//            return AsyncInfo.Run(async (cancel) => {

//                var apduRes = await connectionObject.TransceiveAsync(new MifareUltralight.GetUid());
//                if (!apduRes.Succeeded) {
//                    throw new Exception("Failure getting UID of MIFARE Ultralight card, " + apduRes.ToString());
//                }

//                return (IEnumerable<byte> )apduRes.ResponseData;
//            });
//}
//    }
};

window.MifareUltralight = MifareUltralight;