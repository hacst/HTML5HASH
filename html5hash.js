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
                pos += chunkSize;
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
            reader.readAsBinaryString(blob);
        }

        setTimeout(progressiveReadNext, 0);
    };

    function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var files = evt.dataTransfer.files; // FileList object.

        for (var i = 0, f; f = files[i]; i++) {

            (function() {
                var sha1proc = CryptoJS.algo.SHA1.create();
                var md5proc = CryptoJS.algo.MD5.create();
                var crc32intermediate = 0;

                var uid = "filehash" + getUnique();

                f.uid = uid;
                $("#list").append('<li id="' + uid + '">'
                    + '<b>' + escape(f.name) + '</b>'
                    + '<div class="progress"></div>'
                    + '</li>');

                $("#" + uid + ".progress").progressbar({ value: 0 });

                progressiveRead(f,
                function (data, pos, file) {
                    // Work
                    var progress = Math.floor((pos / file.size) * 100);
                    $("#" + file.uid + " .progress").progressbar({ value: progress });

                    sha1proc.update(data);
                    md5proc.update(data);
                    crc32intermediate = crc32(data, crc32intermediate);
                },
                function (file) {
                    // Done
                    $("#" + file.uid).append(
                        'SHA1: ' + sha1proc.finalize() + '<br />'
                        + 'MD5: ' + md5proc.finalize() + '<br />'
                        + 'CRC-32: ' + decimalToHexString(crc32intermediate));
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