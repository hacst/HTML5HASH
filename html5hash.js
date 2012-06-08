$().ready(function () {
    function decimalToHexString(number) {
        if (number < 0) {
            number = 0xFFFFFFFF + number + 1;
        }

        return number.toString(16);
    }

    function progressiveRead(file, work, done) {
        var chunkSize = 102400; // 100KiB at a time
        var pos = 0;
        var reader = new FileReader();

        function progressiveReadNext() {
            var end = Math.min(pos + chunkSize, file.size);

            reader.onload = function (e) {
                pos += chunkSize;
                work(e.target.result, file);
                if (pos < file.size) {
                    setTimeout(progressiveReadNext, 0);
                }
                else {
                    // Done
                    done(file);
                }
            }

            reader.readAsBinaryString(file.slice(pos, end));
        }

        setTimeout(progressiveReadNext, 0);
    };

    function progressiveHash(file) {

    }

    function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var files = evt.dataTransfer.files; // FileList object.

        for (var i = 0, f; f = files[i]; i++) {

            (function() {
                var sha1proc = CryptoJS.algo.SHA1.create();
                var md5proc = CryptoJS.algo.MD5.create();
                var crc32intermediate = 0;

                progressiveRead(f,
                function (data, file) {
                    // Work
                    sha1proc.update(data);
                    md5proc.update(data);
                    crc32intermediate = crc32(data, crc32intermediate);
                },
                function (file) {
                    // Done
                    document.getElementById('list').innerHTML
                        += '<li><b>' + escape(file.name) + ':</b><br />'
                        + 'SHA1: ' + sha1proc.finalize() + '<br />'
                        + 'MD5: ' + md5proc.finalize() + '<br />'
                        + 'CRC-32: ' + decimalToHexString(crc32intermediate) + '</li>';
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