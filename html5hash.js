$().ready(function () {
    var uniquecnt = 0;

    function getUnique() {
        return (uniquecnt++);
    }

    function decimalToHexString(number) {
        if (number < 0) {
            number = 0xFFFFFFFF + number + 1;
        }

        return number.toString(16);
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

    function arrayBufferToWordArray(arrayBuffer) {
        var u8 = new Uint8Array(arrayBuffer);
        var cp = []
        for (var i = 0; i < 4 * Math.floor(u8.length / 4) ; i += 4) {
            cp.push((u8[i] << 24) + (u8[i + 1] << 16) + (u8[i + 2] << 8) + u8[i + 3]);
        }

        if (u8.length % 4) {
            var pad = 0;
            for (var i = u8.length % 4; i > 0; --i) {
                pad = pad << 8;
                pad += u8[u8.length - i];
            }
            for (var i = 0; i < 4 - (u8.length % 4) ; ++i) {
                pad = pad << 8;
            }
            cp.push(pad)
        }

        return CryptoJS.lib.WordArray.create(cp, u8.length);
    };

    function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var files = evt.dataTransfer.files; // FileList object.
        var lastprogress = 0;
        for (var i = 0, f; f = files[i]; i++) {

            (function () {
                var doSHA1 = $('[name="sha1switch"]').attr("checked") == "checked";
                var doMD5 = $('[name="md5switch"]').attr("checked") == "checked";
                var doCRC32 = $('[name="crc32switch"]').attr("checked") == "checked";

                if (doSHA1) var sha1proc = CryptoJS.algo.SHA1.create();
                if (doMD5) var md5proc = CryptoJS.algo.MD5.create();
                if (doCRC32) var crc32intermediate = 0;

                var uid = "filehash" + getUnique();

                $("#list").append('<li id="' + uid + '">'
                    + '<b>' + escape(f.name) + '</b>'
                    + '<div class="progress"></div>'
                    + '</li>');

                $("#" + uid + ".progress").progressbar({ value: 50 });

                progressiveRead(f,
                function (data, pos, file) {
                    // Work
                    var progress = Math.floor((pos / file.size) * 100);
                    if (progress > lastprogress) {
                        $("#" + uid + " .progress").progressbar({ value: progress });
                        lastprogress = progress;
                    }

                    if (doSHA1 || doMD5) {
                        // Easiest way to get this up and running ;-) Obvious optimization potential there.
                        var wordArray = arrayBufferToWordArray(data);
                    }

                    if (doSHA1) sha1proc.update(wordArray);
                    if (doMD5) md5proc.update(wordArray);
                    if (doCRC32) crc32intermediate = crc32(new Uint8Array(data), crc32intermediate);
                },
                function (file) {
                    // Done
                    var results = '';

                    if (doSHA1) results += 'SHA1: ' + sha1proc.finalize() + '<br />';
                    if (doMD5) results += 'MD5: ' + md5proc.finalize() + '<br />';
                    if (doCRC32) results += 'CRC-32: ' + decimalToHexString(crc32intermediate) + '<br />';
                    
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

    // Setup the dnd listeners.
    var dropZone = document.getElementById('drop_zone');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);
});