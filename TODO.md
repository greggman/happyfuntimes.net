TODO
====

* ipv6
    *   match by prefix. Start at the smallest prefix and work backward?
* Make HFT.net handle making DNS names and redirecting

    *  local machine pings hft.net
    *  hft.net makes domain entry. `<user>.game.happyfuntimes.net` What should `<user>` be?

       *   Random id made when HFT installed?
       *   specific username?
       *   id made by HFT.net?
           *   User pings HFT.net with current key
           *   If key matches HFT.net gives old id.
           *   If key does not match. HFT.net makes new key
           *   local saves key

* Make HFT serve HTTPS
* Make HFT-Unity serve HTTPS

* Make HFT.net get certificates
    *   HFT pings HFT.net with key
    *
