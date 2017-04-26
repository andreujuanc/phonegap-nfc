var Iso7816 = {
    Cla: {
        CompliantCmd0x : 0x00,
        AppCompliantCmdAx : 0xA0,
        ProprietaryCla8x : 0x80,
        ProprietaryCla9x : 0x90,
        ReservedForPts : 0xFF,           // Protocol Type Selelction
    },
    /// <summary>
    /// Enumeration of lower nibbile of CLA 
    /// </summary>
    ClaXx: {
        NoSmOrNoSmIndication : 0x00,
        ProprietarySmFormat : 0x01,
        SecureMessageNoHeaderSM : 0x10,
        SecureMessage1p6 : 0x11,
    },
    /// <summary>
    /// Enumeration of possible instructions 
    /// </summary>
    Ins: {
        EraseBinary : 0x0E,
        Verify : 0x20,
        ManageChannel : 0x70,
        ExternalAuthenticate : 0x82,
        GetChallenge : 0x84,
        InternalAuthenticate : 0x88,
        SelectFile : 0xA4,
        ReadBinary : 0xB0,
        ReadRecords : 0xB2,
        GetResponse : 0xC0,
        Envelope : 0xC2,
        GetData : 0xCA,
        WriteBinary : 0xD0,
        WriteRecord : 0xD2,
        UpdateBinary : 0xD6,
        PutData : 0xDA,
        UpdateData : 0xDC,
        AppendRecord : 0xE2,
    }
};

var ApduResponse = function() {
        this.TAG_MULTI_BYTE_MASK = 0x1F;
        this.TAG_COMPREHENSION_MASK = 0x80;
        this.TAG_LENGTH_MULTI_BYTE_MASK = 0x80;


    /// <summary>
    /// method to extract the response data, status and qualifier
    /// </summary>
    /// <param name="response"></param>
        this.ExtractResponse = function(response) //response :IBuffer
        {
            if (response.length < 2) {
                throw new InvalidOperationException("APDU response must be at least 2 bytes");
            }
            var reader = Windows.Storage.Streams.DataReader.fromBuffer(response);

            this.ResponseData = new Array(response.length - 2);
            reader.readBytes(this.ResponseData);
            this.SW1 = reader.readByte();
            this.SW2 = reader.readByte();
        }

        /// <summary>
        /// method to extract the matching TLV data object from response data
        /// </summary>
        //public byte[] ExtractTlvDataObject([ReadOnlyArray]byte[] referenceTag)
        this.ExtractTlvDataObject = function (referenceTag)
        {
            //using(var reader = DataReader.FromBuffer(ResponseData.AsBuffer()))
            //    {
            //        byte nextByte;

            //    while (reader.UnconsumedBufferLength > 0) {
            //        int lengthLength = 0, valueLength = 0;
            //        MemoryStream tag = new MemoryStream(), value = new MemoryStream();

            //        nextByte = reader.ReadByte();
            //        tag.WriteByte(nextByte);

            //        if ((nextByte & TAG_MULTI_BYTE_MASK) == TAG_MULTI_BYTE_MASK) {
            //            while (reader.UnconsumedBufferLength > 0) {
            //                nextByte = reader.ReadByte();
            //                tag.WriteByte(nextByte);

            //                if ((nextByte & TAG_COMPREHENSION_MASK) != TAG_COMPREHENSION_MASK)
            //                    break;
            //            }
            //        }

            //        if (reader.UnconsumedBufferLength == 0)
            //            throw new Exception("Invalid length for TLV response");

            //        valueLength = reader.ReadByte();
            //        lengthLength = 1;

            //        if ((valueLength & TAG_LENGTH_MULTI_BYTE_MASK) == TAG_LENGTH_MULTI_BYTE_MASK)
            //            lengthLength += (valueLength & ~TAG_LENGTH_MULTI_BYTE_MASK);

            //        while (--lengthLength > 0)
            //            valueLength = (valueLength << 8) | reader.ReadByte();

            //        while (valueLength != 0 && valueLength-- > 0)
            //            value.WriteByte(reader.ReadByte());

            //        if (referenceTag.SequenceEqual(tag.ToArray()))
            //            return value.ToArray();
            //    }

            //    throw new Exception("Tag not found in the TLV response");
            //}
        }
        /// <summary>
        /// Detects if the command has succeeded
        /// </summary>
        /// <returns></returns>
        this.Succeeded = function () {
            return this.SW() == 0x9000;
        }

        /// <summary>
        /// command processing status
        /// </summary>
        this.SW1 = null;
        /// <summary>
        /// command processing qualifier
        /// </summary>
        this.SW2 = null;
        /// <summary>
        /// Wrapper property to read both response status and qualifer
        /// </summary>
        this.SW = function (value)
        {
            if(typeof value === 'undefined')
                return ((this.SW1 << 8) | this.SW2);

            this.SW1 = (value >> 8);
            this.SW2 = (value & 0xFF);            
        }
        /// <summary>
        /// Response data
        /// </summary>
        this.ResponseData = null;
        /// <summary>
        /// Mapping response status and qualifer to human readable format
        /// </summary>
        this.SWTranslation = function () {

            switch (this.SW) {
                case 0x9000:
                    return "Success";

                case 0x6700:
                    return "Incorrect length or address range error";

                case 0x6800:
                    return "The requested function is not supported by the card";

                default:
                    return "Unknown";
            }
        };
        /// <summary>
        /// Helper method to print the response in a readable format
        /// </summary>
        /// <returns>
        /// return string formatted response
        /// </returns>
        //public sealed override string ToString()
        //{
        //    return "ApduResponse SW=" + SW.ToString("X4") + " (" + SWTranslation + ")" + ((ResponseData != null && ResponseData.Length > 0) ? (",Data=" + BitConverter.ToString(ResponseData).Replace("-", "")) : "");
        //}
    }

var ApduCommand = function (cla, ins, p1, p2, commandData, le) {
    //        if (commandData != null && commandData.Length > 254) {
    //            throw new NotImplementedException();
    //        }

    /// <summary>
    /// Class of instructions
    /// </summary>
    this.CLA = cla;

    /// <summary>
    /// Instruction code
    /// </summary>
    this.INS = ins;

    /// <summary>
    /// Instruction parameter 1
    /// </summary>
    this.P1 = p1;

    /// <summary>
    /// Instruction parameter 2
    /// </summary>
    this.P2 = p2;

    /// <summary>
    /// Contiguous array of bytes representing commands data
    /// </summary>
    this.CommandData = commandData;

    /// <summary>
    /// Maximum number of bytes expected in the response ot this command
    /// </summary>
    this.Le = le;


    /// <summary>
    /// Expected response type for this command.
    /// Provides mechanism to bind commands to responses
    /// </summary>
    this.ApduResponseType = ApduResponse;
    //        /// <summary>
    //        /// Packs the current command into contiguous buffer bytes
    //        /// </summary>
    //        /// <returns>
    //        /// buffer holds the current wire/air format of the command
    //        /// </returns>
    this.GetBuffer = function () {
        var writer = new Windows.Storage.Streams.DataWriter();
        writer.unicodeEncoding = Windows.Storage.Streams.UnicodeEncoding.utf16LE;
        writer.writeByte(this.CLA);
        writer.writeByte(this.INS);
        writer.writeByte(this.P1);
        writer.writeByte(this.P2);

        if (this.CommandData != null && this.CommandData.Length > 0) {
            writer.writeByte(this.CommandData.Length);
            writer.writeBytes(thisCommandData);
        }

        if (this.Le != null) {
            writer.writeByte(this.Le);
        }

        var atrBuffer = writer.detachBuffer();
        return atrBuffer;
        //using(DataWriter writer = new DataWriter())
        //{
        //    writer.WriteByte(CLA);
        //    writer.WriteByte(INS);
        //    writer.WriteByte(P1);
        //    writer.WriteByte(P2);

        //    if (CommandData != null && CommandData.Length > 0) {
        //        writer.WriteByte((byte)CommandData.Length);
        //        writer.WriteBytes(CommandData);
        //    }

        //    if (Le != null) {
        //        writer.WriteByte((byte)Le);
        //    }

        //    return writer.DetachBuffer();
        //}
    }
    //        /// <summary>
    //        /// Helper method to print the command in a readable format
    //        /// </summary>
    //        /// <returns>
    //        /// return string formatted command
    //        /// </returns>
    //        public override sealed string ToString()
    //        {
    //                    return "ApduCommand CLA=" + CLA.ToString("X2") + ",INS=" + INS.ToString("X2") + ",P1=" + P1.ToString("X2") + ",P2=" + P2.ToString("X2") + ((CommandData != null && CommandData.Length > 0) ? (",Data=" + BitConverter.ToString(CommandData).Replace("-", "")) : "");
    //        }
};

var GetData = function (type) {
    ApduCommand.call(this, Iso7816.Cla.ReservedForPts, Pcsc.Ins.GetData, type, 0, null, 0);
  
    //{
    //    
    //}
    //    public GetDataDataType Type
    //{
    //    set { base.P1 = (byte)value; }
    //    get { return (GetDataDataType)base.P1; }
    //}
    // public GetData(GetDataDataType type)
    //            : base((byte)Iso7816.Cla.ReservedForPts, (byte)Pcsc.Ins.GetData, (byte)type, 0, null, 0)
    //{
    //}
};

GetData.GetDataDataType = {
    Uid : 0x00,
    HistoricalBytes : 0x01 // Returned data excludes CRC
};

//GetData.prototype