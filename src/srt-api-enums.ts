export enum SRTSockOpt {
  SRTO_MSS = 0,             // the Maximum Transfer Unit
  SRTO_SNDSYN = 1,          // if sending is blocking
  SRTO_RCVSYN = 2,          // if receiving is blocking
  SRTO_ISN = 3,             // Initial Sequence Number (valid only after srt_connect or srt_accept-ed sockets)
  SRTO_FC = 4,              // Flight flag size (window size)
  SRTO_SNDBUF = 5,          // maximum buffer in sending queue
  SRTO_RCVBUF = 6,          // UDT receiving buffer size
  SRTO_LINGER = 7,          // waiting for unsent data when closing
  SRTO_UDP_SNDBUF = 8,      // UDP sending buffer size
  SRTO_UDP_RCVBUF = 9,      // UDP receiving buffer size
  // XXX Free space for 2 options
  // after deprecated ones are removed
  SRTO_RENDEZVOUS = 12,     // rendezvous connection mode
  SRTO_SNDTIMEO = 13,       // send() timeout
  SRTO_RCVTIMEO = 14,       // recv() timeout
  SRTO_REUSEADDR = 15,      // reuse an existing port or create a new one
  SRTO_MAXBW = 16,          // maximum bandwidth (bytes per second) that the connection can use
  SRTO_STATE = 17,          // current socket state, see UDTSTATUS, read only
  SRTO_EVENT = 18,          // current available events associated with the socket
  SRTO_SNDDATA = 19,        // size of data in the sending buffer
  SRTO_RCVDATA = 20,        // size of data available for recv
  SRTO_SENDER = 21,         // Sender mode (independent of conn mode), for encryption, tsbpd handshake.
  SRTO_TSBPDMODE = 22,      // Enable/Disable TsbPd. Enable -> Tx set origin timestamp, Rx deliver packet at origin time + delay
  SRTO_LATENCY = 23,        // NOT RECOMMENDED. SET: to both SRTO_RCVLATENCY and SRTO_PEERLATENCY. GET: same as SRTO_RCVLATENCY.
  SRTO_TSBPDDELAY = 23,     // DEPRECATED. ALIAS: SRTO_LATENCY
  SRTO_INPUTBW = 24,        // Estimated input stream rate.
  SRTO_OHEADBW,             // MaxBW ceiling based on % over input stream rate. Applies when UDT_MAXBW=0 (auto).
  SRTO_PASSPHRASE = 26,     // Crypto PBKDF2 Passphrase size[0,10..64] 0:disable crypto
  SRTO_PBKEYLEN,            // Crypto key len in bytes {16,24,32} Default: 16 (128-bit)
  SRTO_KMSTATE,             // Key Material exchange status (UDT_SRTKmState)
  SRTO_IPTTL = 29,          // IP Time To Live (passthru for system sockopt IPPROTO_IP/IP_TTL)
  SRTO_IPTOS,               // IP Type of Service (passthru for system sockopt IPPROTO_IP/IP_TOS)
  SRTO_TLPKTDROP = 31,      // Enable receiver pkt drop
  SRTO_SNDDROPDELAY = 32,   // Extra delay towards latency for sender TLPKTDROP decision (-1 to off)
  SRTO_NAKREPORT = 33,      // Enable receiver to send periodic NAK reports
  SRTO_VERSION = 34,        // Local SRT Version
  SRTO_PEERVERSION,         // Peer SRT Version (from SRT Handshake)
  SRTO_CONNTIMEO = 36,      // Connect timeout in msec. Ccaller default: 3000, rendezvous (x 10)
  // deprecated: SRTO_TWOWAYDATA, SRTO_SNDPBKEYLEN, SRTO_RCVPBKEYLEN (@c below)
  _DEPRECATED_SRTO_SNDPBKEYLEN = 38, // (needed to use inside the code without generating -Wswitch)
  //
  SRTO_SNDKMSTATE = 40,     // (GET) the current state of the encryption at the peer side
  SRTO_RCVKMSTATE,          // (GET) the current state of the encryption at the agent side
  SRTO_LOSSMAXTTL,          // Maximum possible packet reorder tolerance (number of packets to receive after loss to send lossreport)
  SRTO_RCVLATENCY,          // TsbPd receiver delay (mSec) to absorb burst of missed packet retransmission
  SRTO_PEERLATENCY,         // Minimum value of the TsbPd receiver delay (mSec) for the opposite side (peer)
  SRTO_MINVERSION,          // Minimum SRT version needed for the peer (peers with less version will get connection reject)
  SRTO_STREAMID,            // A string set to a socket and passed to the listener's accepted socket
  SRTO_CONGESTION,          // Congestion controller type selection
  SRTO_MESSAGEAPI,          // In File mode, use message API (portions of data with boundaries)
  SRTO_PAYLOADSIZE,         // Maximum payload size sent in one UDP packet (0 if unlimited)
  SRTO_TRANSTYPE = 50,      // Transmission type (set of options required for given transmission type)
  SRTO_KMREFRESHRATE,       // After sending how many packets the encryption key should be flipped to the new key
  SRTO_KMPREANNOUNCE,       // How many packets before key flip the new key is annnounced and after key flip the old one decommissioned
  SRTO_ENFORCEDENCRYPTION,  // Connection to be rejected or quickly broken when one side encryption set or bad password
  SRTO_IPV6ONLY,            // IPV6_V6ONLY mode
  SRTO_PEERIDLETIMEO,       // Peer-idle timeout (max time of silence heard from peer) in [ms]
  // (some space left)
  SRTO_PACKETFILTER = 60          // Add and configure a packet filter
}

export enum SRTEpollOpt
{
   SRT_EPOLL_OPT_NONE = 0x0, // fallback
   // this values are defined same as linux epoll.h
   // so that if system values are used by mistake, they should have the same effect
   SRT_EPOLL_IN       = 0x1,
   SRT_EPOLL_OUT      = 0x4,
   SRT_EPOLL_ERR      = 0x8,
   SRT_EPOLL_ET       = 0x80000000 // (2147483648) C: 1u << 31
};

export enum SRTSockStatus {
  SRTS_INIT = 1,
  SRTS_OPENED,
  SRTS_LISTENING,
  SRTS_CONNECTING,
  SRTS_CONNECTED,
  SRTS_BROKEN,
  SRTS_CLOSING,
  SRTS_CLOSED,
  SRTS_NONEXIST
}

export enum SRTResult {
  SRT_ERROR = -1,
  SRT_OK = 0
}

/**
 * Enum values as taken from native SRT logging API declarations
 */
export enum SRTLoggingLevel {
  FATAL = 2,
  // Fatal vs. Error: with Error, you can still continue.
  ERROR = 3,
  // Error vs. Warning: Warning isn't considered a problem for the library.
  WARNING = 4,
  // Warning vs. Note: Note means something unusual, but completely correct behavior.
  NOTE = 5,
  // Note vs. Debug: Debug may occur even multiple times in a millisecond.
  // (Well, worth noting that Error and Warning potentially also can).
  DEBUG = 7
}



