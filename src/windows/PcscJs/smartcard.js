(function () {
    /* globals:  export, module, console, document, ndef, Windows, Uint8Array */

    "use strict";

    function sequenceEqual(l, r) {
        if (l.length === r.length) {
            for (var i = 0, len = l.length; i < len; i++) {
                if (l[i] !== r[i]) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    var CardName =
        {
            Unknown: 0x0000,

            MifareStandard1K: 0x0001,
            MifareStandard4K: 0x0002,
            MifareUltralight: 0x0003,
            SLE55R: 0x0004,
            SR176: 0x0006,
            SRIX4K: 0x0007,
            AT88RF020: 0x0008,
            AT88SC0204CRF: 0x0009,
            AT88SC0808CRF: 0x000A,
            AT88SC1616CRF: 0x000B,
            AT88SC3216CRF: 0x000C,
            AT88SC6416CRF: 0x000D,
            SRF55V10P: 0x000E,
            SRF55V02P: 0x000F,
            SRF55V10S: 0x0010,
            SRF55V02S: 0x0011,
            TAG_IT: 0x0012,
            LRI512: 0x0013,
            ICODESLI: 0x0014,
            TEMPSENS: 0x0015,
            ICODE1: 0x0016,
            PicoPass2K: 0x0017,
            PicoPass2KS: 0x0018,
            PicoPass16K: 0x0019,
            PicoPass16Ks: 0x001A,
            PicoPass16K8x2: 0x001B,
            PicoPass16KS8x2: 0x001C,
            PicoPass32KS16p16: 0x001D,
            PicoPass32KS16p8x2: 0x001E,
            PicoPass32KS8x2p16: 0x001F,
            PicoPass32KS8x2p8x2: 0x0020,
            LRI64: 0x0021,
            ICODEUID: 0x0022,
            ICODEEPC: 0x0023,
            LRI12: 0x0024,
            LRI128: 0x0025,
            MifareMini: 0x0026,
            SLE66R01P: 0x0027,
            SLE66RxxP: 0x0028,
            SLE66RxxS: 0x0029,
            SLE55RxxE: 0x002A,
            SRF55V01P: 0x002B,
            SRF66V10ST: 0x002C,
            SRF66V10IT: 0x002D,
            SRF66V01ST: 0x002E,
            JewelTag: 0x002F,
            TopazTag: 0x0030,
            AT88SC0104CRF: 0x0031,
            AT88SC0404CRF: 0x0032,
            AT88RF01C: 0x0033,
            AT88RF04C: 0x0034,
            iCodeSL2: 0x0035,
            MifarePlusSL1_2K: 0x0036,
            MifarePlusSL1_4K: 0x0037,
            MifarePlusSL2_2K: 0x0038,
            MifarePlusSL2_4K: 0x0039,
            MifareUltralightC: 0x003A,
            FeliCa: 0x003B,
            MelexisSensorTagMLX90129: 0x003C,
            MifareUltralightEV1: 0x003D,
            CardNameMaxValue: 0
        }; CardName.CardNameMaxValue = CardName.MifareUltralightEV1;

    var DeviceClass =
        {
            Unknown: 0x00,
            StorageClass: 0x01,  // for PCSC class, there will be subcategory to identify the physical icc
            Iso14443P4: 0x02,
            MifareDesfire: 0x03,
        }

    var IccDetection = function (card, connection) {

        var InitialHeader = 0x3B;
        var CategoryIndicator = {
            StatusInfoPresentAtEnd: 0x00,
            StatusInfoPresentInTlv: 0x80
        }

        var AtrInfo = function () {
            AtrInfo.MAXIMUM_ATR_CODES = 4;

            this.ProtocolInterfaceA = [0, 0, 0, 0];
            this.ProtocolInterfaceB = [0, 0, 0, 0];
            this.ProtocolInterfaceC = [0, 0, 0, 0];
            this.ProtocolInterfaceD = [0, 0, 0, 0];

            this.HistoricalBytes = null;

            this.TckValid = false;
        }

        var HiNibble = function (byte) {

            //var higher_nibble = byte & 0x0F;
            var higher_nibble = byte >> 4;
            return higher_nibble;
        }
        var LowNibble = function (byte) {
            var lower_nibble = (byte & 0x0F);;//>> 4;
            return lower_nibble;
        }

        var ValidateTCK = function (atr) {
            var ctk = 0;

            for (var i = 1; i < atr.Length; i++) {
                ctk ^= atr[i];
            }

            return (ctk == 0);
        }

        var atrParse = function (atrBytes) {
            var atrInfo = new AtrInfo();
            var initialChar = 0, formatByte = 0;
            var supportedProtocols = 0;

            var dataWriter = new Windows.Storage.Streams.DataWriter();
            dataWriter.unicodeEncoding = Windows.Storage.Streams.UnicodeEncoding.utf16LE;
            dataWriter.writeBytes(atrBytes);
            var atrBuffer = dataWriter.detachBuffer();

            var reader = Windows.Storage.Streams.DataReader.fromBuffer(atrBuffer);
            initialChar = reader.readByte();

            if (initialChar != InitialHeader) {
                return null;
            }

            formatByte = reader.readByte();
            var interfacePresence = (HiNibble(formatByte) << 4);

            for (var i = 0; i < AtrInfo.MAXIMUM_ATR_CODES; i++) {
                if ((interfacePresence & 0x10) != 0)
                    atrInfo.ProtocolInterfaceA[i] = reader.readByte();

                if ((interfacePresence & 0x20) != 0)
                    atrInfo.ProtocolInterfaceB[i] = reader.readByte();

                if ((interfacePresence & 0x40) != 0)
                    atrInfo.ProtocolInterfaceC[i] = reader.readByte();

                if ((interfacePresence & 0x80) != 0)
                    atrInfo.ProtocolInterfaceD[i] = reader.readByte();
                else
                    break;

                interfacePresence = atrInfo.ProtocolInterfaceD[i];
                supportedProtocols |= (1 << LowNibble(interfacePresence));
            }

            atrInfo.HistoricalBytes = reader.readBuffer(LowNibble(formatByte));

            if ((supportedProtocols & ~1) != 0) {
                atrInfo.TckValid = ValidateTCK(atrBytes);
            }

            return atrInfo;
        };

        var detection = {
            smartCard: card,
            connection: connection,
            Atr: null,
            AtrInformation: null,
            DetectCard: function () {
                if (detection.AtrInformation.HistoricalBytes.length > 1) {
                    var categoryIndicator;
                    var reader = Windows.Storage.Streams.DataReader.fromBuffer(detection.AtrInformation.HistoricalBytes);
                    categoryIndicator = reader.readByte();
                    if (categoryIndicator == CategoryIndicator.StatusInfoPresentInTlv) {
                        while (reader.unconsumedBufferLength > 0) {
                            var appIdPresenceIndTag = 0x4F;
                            var appIdPresenceIndTagLen = 0x0C;

                            var tagValue = reader.readByte();
                            var tagLength = reader.readByte();

                            if (tagValue == appIdPresenceIndTag && tagLength == appIdPresenceIndTagLen) {
                                var pcscRid = [0xA0, 0x00, 0x00, 0x03, 0x06];
                                var pcscRidRead = [0, 0, 0, 0, 0]; //new byte[pcscRid.Length]; // maybe try with new Array(pcscRid.Length);

                                reader.readBytes(pcscRidRead);

                                if (sequenceEqual(pcscRid, pcscRidRead)) {
                                    var storageStandard = reader.readByte();
                                    var cardName = reader.readUInt16();
                                    detection.PcscCardName = cardName;//(Pcsc.CardName)cardName;
                                    detection.PcscDeviceClass = DeviceClass.StorageClass;
                                }
                                reader.readBuffer(4); // RFU bytes
                            }
                            else {
                                reader.ReadBuffer(tagLength);
                            }
                        }
                    }

                }
                else {
                    // Compare with Mifare DesFire card ATR
                    var desfireAtr = [0x3B, 0x81, 0x80, 0x01, 0x80, 0x80];

                    if (sequenceEqual(Atr, desfireAtr)) {
                        PcscDeviceClass = DeviceClass.MifareDesfire;
                    }
                }
            },
            DetectCardTypeAync: function () {
                return new Promise(function (resolve, reject) {
                    detection.smartCard.getAnswerToResetAsync()
                        .then(function (atrBuffer) {
                            var bytes = new Uint8Array(atrBuffer.length);
                            var dataReader = Windows.Storage.Streams.DataReader.fromBuffer(atrBuffer);
                            dataReader.readBytes(bytes);
                            dataReader.close();

                            detection.Atr = bytes;
                            detection.AtrInformation = atrParse(detection.Atr, atrBuffer);
                            if (detection.AtrInformation != null && detection.AtrInformation.HistoricalBytes.length > 0) {
                                detection.DetectCard();
                                return resolve(detection);
                            }
                            return reject('Could not parse Atr Information');
                        });

                });
            }
        };
        return detection;
    };

    var self = {

        init: function () {
            var selector = Windows.Devices.SmartCards.SmartCardReader.getDeviceSelector();
            Windows.Devices.Enumeration.DeviceInformation.findAllAsync(selector, null)
                .done(function (devicesFound) {
                    var deviceId = devicesFound[0].id;
                    //deviceId = self.proximityDevice.deviceId;
                    Windows.Devices.SmartCards.SmartCardReader.fromIdAsync(deviceId)
                        .done(self.initSmartCard);

                });
        },
        initSmartCard: function (smartCardFound) {

            smartCardFound.getStatusAsync().done(function (status) {
                //smartCardFound.addEventListener('oncardadded', self.cardEvent);
                smartCardFound.addEventListener('cardadded', self.cardEvent);
                //smartCardFound.addEventListener('OnCardAdded', self.cardEvent);
                //smartCardFound.addEventListener('CardAdded', self.cardEvent);
                //smartCardFound.oncardadded = self.cardEvent;

                //smartCardFound.findAllCardsAsync()
                //    .done(function (cards, b, c) {
                //        if (cards.length > 0)
                //            self.handleCard(cards[0]);
                //    })
                self.smartCard = smartCardFound;
            });
        },
        cardEvent: function (sender, eventArgs) {
            if (sender && sender.detail && sender.detail.length > 0)
                self.handleCard(sender.detail[0].smartCard);
        },
        handleCard: function (card) {
            card.connectAsync()
                .done(function (connection) {
                    IccDetection(card, connection)
                        .DetectCardTypeAync()
                        .then(function (cardIdentification) {

                            if ((cardIdentification.PcscDeviceClass == DeviceClass.StorageClass) &&
                                (cardIdentification.PcscCardName == CardName.MifareUltralightC
                                    || cardIdentification.PcscCardName == CardName.MifareUltralight
                                    || cardIdentification.PcscCardName == CardName.MifareUltralightEV1)) {

                                var mifareULAccess = new MifareUltralight.AccessHandler(connection);
                                // Each read should get us 16 bytes/4 blocks, so doing
                                // 4 reads will get us all 64 bytes/16 blocks on the card
                                //for (byte i = 0; i < 4; i++)
                                //{
                                //    var response = await mifareULAccess.ReadAsync((byte)(4 * i));
                                //    LogMessage("Block " + (4 * i).ToString() + " to Block " + (4 * i + 3).ToString() + " " + BitConverter.ToString(response));
                                //}

                                mifareULAccess.GetUidAsync()
                                    .then(function (responseUid) {
                                        var uid = responseUid.toString();
                                        debugger;
                                    }, function (error) {
                                        debugger;
                                    });
                                //LogMessage("UID:  " + BitConverter.ToString(responseUid));

                            }
                            else if (cardIdentification.PcscDeviceClass == DeviceClass.MifareDesfire) {
                                debugger;
                            }
                        });

                });
        }
    };

    window.smartCard = self;
})();

smartCard.init();