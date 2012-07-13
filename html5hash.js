$().ready(function () {
    var uniquecnt = 0;

    function isLittleEndian() {
        var buf = new ArrayBuffer(4);
        var data = new Uint32Array(buf);

        // Determine whether Uint32 is little- or big-endian.
        data[0] = 0x0a0b0c0d;

        if (buf[0] === 0x0a && buf[1] === 0x0b && buf[2] === 0x0c &&  buf[3] === 0x0d) {
            return false;
        }

        return true;
    }

    console.log(isLittleEndian());

    function getUnique() {
        return (uniquecnt++);
    }

    function decimalToHexString(number) {
        if (number < 0) {
            number = 0xFFFFFFFF + number + 1;
        }

        return number.toString(16);
    }

    function digits(number, dig) {
        var shift = Math.pow(10, dig);
        return Math.floor(number * shift) / shift;
    }

    function progressiveRead(file, work, done) {
        var chunkSize = 20480; // 20KiB at a time
        var pos = 0;
        var reader = new FileReader();

        function progressiveReadNext() {
            var end = Math.min(pos + chunkSize, file.size);

            reader.onload = function (e) {
                pos = end;
                work(e.target.result, pos, file);
                if (pos < file.size) {
                    setTimeout(progressiveReadNext, 0);
                }
                else {
                    // Done
                    done(file);
                }
            }

            if (file.slice) {
                var blob = file.slice(pos, end);
            }
            else if (file.webkitSlice) {
                var blob = file.webkitSlice(pos, end);
            }
            reader.readAsArrayBuffer(blob);
        }

        setTimeout(progressiveReadNext, 0);
    };

    function swapendian32(val) {
        return (((val & 0xFF) << 24)
           | ((val & 0xFF00) << 8)
           | ((val >> 8) & 0xFF00)
           | ((val >> 24) & 0xFF)) >>> 0;

    }
 
    function arrayBufferToWordArray(arrayBuffer) {
        var fullWords = Math.floor(arrayBuffer.byteLength / 4);
        var bytesLeft = arrayBuffer.byteLength % 4;

        var u32 = new Uint32Array(arrayBuffer, 0, fullWords);
        var u8 = new Uint8Array(arrayBuffer);

        var cp = [];
        for (var i = 0; i < fullWords; ++i) {
            cp.push(swapendian32(u32[i]));
        }

        if (bytesLeft) {
            var pad = 0;
            for (var i = bytesLeft; i > 0; --i) {
                pad = pad << 8;
                pad += u8[u8.byteLength - i];
            }

            for (var i = 0; i < 4 - bytesLeft; ++i) {
                pad = pad << 8;
            }

            cp.push(pad);
        }

        return CryptoJS.lib.WordArray.create(cp, arrayBuffer.byteLength);
    };

    function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var files = evt.dataTransfer.files; // FileList object.

        for (var i = 0, f; f = files[i]; i++) {

            (function () {
                var start = (new Date).getTime();
                var lastprogress = 0;

                var doSHA1 = $('[name="sha1switch"]').attr("checked") == "checked";
                var doMD5 = $('[name="md5switch"]').attr("checked") == "checked";
                var doCRC32 = $('[name="crc32switch"]').attr("checked") == "checked";

                if (doSHA1) var sha1proc = CryptoJS.algo.SHA1.create();
                if (doMD5) var md5proc = CryptoJS.algo.MD5.create();
                if (doCRC32) var crc32intermediate = 0;

                var uid = "filehash" + getUnique();

                $("#list").append('<li id="' + uid + '">'
                    + '<b>' + escape(f.name) + ' <span class="progresstext"></span></b>'
                    + '<div class="progress"></div>'
                    + '</li>');

                $("#" + uid + " .progress").progressbar({ value: 0 });

                progressiveRead(f,
                function (data, pos, file) {
                    // Work
                    if (doSHA1 || doMD5) {
                        // Easiest way to get this up and running ;-) Obvious optimization potential there.
                        var wordArray = arrayBufferToWordArray(data);
                    }

                    if (doSHA1) sha1proc.update(wordArray);
                    if (doMD5) md5proc.update(wordArray);
                    if (doCRC32) crc32intermediate = crc32(new Uint8Array(data), crc32intermediate);

                    // Update progress display
                    var progress = Math.floor((pos / file.size) * 100);
                    if (progress > lastprogress) {
                        $("#" + uid + " .progress").progressbar({ value: progress });

                        var sizeMB = file.size / 1024 / 1024;
                        var posMB = pos / 1024 / 1024;

                        var took = ((new Date).getTime() - start) / 1000;
                        var rate = posMB / took;

                        $("#" + uid + " .progresstext").html('('
                            + digits(posMB, 2) + '/' + digits(sizeMB, 2) + ' MiB @ ' + digits(rate, 2) + ' MiB/s )');

                        lastprogress = progress;
                    }
                },
                function (file) {
                    // Done
                    var took = ((new Date).getTime() - start) / 1000;
                    var rate = ((file.size / 1024 / 1024) / took);

                    var results = '';

                    if (doSHA1) results +=  'SHA1:   ' + sha1proc.finalize() + '<br />';
                    if (doMD5) results +=   'MD5:    ' + md5proc.finalize() + '<br />';
                    if (doCRC32) results += 'CRC-32: ' + decimalToHexString(crc32intermediate) + '<br />';

                    results += 'Time taken: ' + digits(took, 2) + 's @ ' + digits(rate, 2) + ' MiB/s<br />';
                    
                    $("#" + uid).append(results);
                });
            })();
        };

    }

    function handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }

    function debuggingstubstuff() {
        // Dummy testing content
        var uid = "filehash" + getUnique();

        $("#list").append('<li id="' + uid + '">'
                    + '<b>' + 'Just testin.html' + ' <span class="progresstext"></span></b>'
                    + '<div class="progress"></div>'
                    + '</li>');

        $("#" + uid + " .progress").progressbar({ value: 20 });

        // Dummy testing content
        var uid = "filehash" + getUnique();

        $("#list").append('<li id="' + uid + '">'
                    + '<b>' + 'Just testin2.html' + ' <span class="progresstext"></span></b>'
                    + '<div class="progress"></div>'
                    + '</li>');

        $("#" + uid + " .progress").progressbar({ value: 50 });

        // Dummy testing content
        var uid = "filehash" + getUnique();

        $("#list").append('<li id="' + uid + '">'
                    + '<b>' + 'Just testin3.html' + ' <span class="progresstext"></span></b>'
                    + '<div class="progress"></div>'
                    + '</li>');

        $("#" + uid + " .progress").progressbar({ value: 90 });
    };


    // Setup the dnd listeners.
    var dropZone = document.getElementById('drop_zone');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);

    //debuggingstubstuff();

});