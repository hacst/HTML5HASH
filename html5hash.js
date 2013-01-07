$().ready(function () {


    /*
     * Helpers
     */

    getUnique = function () {
        var uniquecnt = 0;

        function getUnique() {
            return (uniquecnt++);
        }

        return getUnique;
    }();

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

    function escapeHtml(text) {
        return $('<div/>').text(text).html();
    }

    function swapendian32(val) {
        return (((val & 0xFF) << 24)
           | ((val & 0xFF00) << 8)
           | ((val >> 8) & 0xFF00)
           | ((val >> 24) & 0xFF)) >>> 0;

    }

    function bytes2si(bytes, outputdigits) {
        if (bytes < 1024) { // Bytes
            return digits(bytes, outputdigits) + " b";
        }
        else if (bytes < 1048576) { // KiB
            return digits(bytes / 1024, outputdigits) + " KiB";
        }
        
        return digits(bytes / 1048576, outputdigits) + " MiB";
    }

    function bytes2si2(bytes1, bytes2, outputdigits) {
        var big = Math.max(bytes1, bytes2);

        if (big < 1024) { // Bytes
            return bytes1 + "/" + bytes2 + " b";
        }
        else if (big < 1048576) { // KiB
            return digits(bytes1 / 1024, outputdigits) + "/" +
                digits(bytes2 / 1024, outputdigits) + " KiB";
        }

        return digits(bytes1 / 1048576, outputdigits) + "/" +
            digits(bytes2 / 1048576, outputdigits) + " MiB";
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

    function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        if (evt.target.files) {
            var files = evt.target.files;
        }
        else {
            var files = evt.dataTransfer.files; // FileList object.
        }

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

                $("#list").append('<li id="' + uid + '" class="entrystyle">'
                    + '<b>' + escapeHtml(f.name) + ' <span class="progresstext"></span></b>'
                    + '<div class="progress"></div>'
                    + '</li>');

                progressiveRead(f,
                function (data, pos, file) {
                    // Work
                    if (doSHA1 || doMD5) {
                        // Easiest way to get this up and running ;-) Obvious optimization potential there.
                        var wordArray = CryptoJS.lib.WordArray.create(data, data.byteLength);
                    }

                    if (doSHA1) sha1proc.update(wordArray);
                    if (doMD5) md5proc.update(wordArray);
                    if (doCRC32) crc32intermediate = crc32(new Uint8Array(data), crc32intermediate);

                    // Update progress display
                    var progress = Math.floor((pos / file.size) * 100);
                    if (progress > lastprogress) {
                        var took = ((new Date).getTime() - start) / 1000;

                        if (took > 0.1) // Only show progressbar after 100ms so it won't show for very small files
                            $("#" + uid + " .progress").progressbar({ value: progress });

                        $("#" + uid + " .progresstext").html('('
                            + bytes2si2(pos, file.size, 2) + ' @ ' + bytes2si(pos / took, 2) + '/s )');
                        
                        lastprogress = progress;
                    }
                },
                function (file) {
                    // Done
                    var took = ((new Date).getTime() - start) / 1000;

                    var results = '<div class="resultdiv"><table>';

                    if (doSHA1) results +=  '<tr><td>SHA1:</td><td>' + sha1proc.finalize() + '</td></tr>';
                    if (doMD5) results +=   '<tr><td>MD5:</td><td>' + md5proc.finalize() + '</td></tr>';
                    if (doCRC32) results += '<tr><td>CRC-32:</td><td>' + decimalToHexString(crc32intermediate) + '</td></tr>';

                    results += '</table></div>';

                    results += '<span class="resulttaken">Time taken: ' + digits(took, 2) + 's @ ' + bytes2si(file.size / took, 2) + '/s</span><br />';
                    
                    $("#" + uid).append(results);

                    $("#" + uid + " .progress")
                        .hide('slow');

                    $("#" + uid)
                        .css('background-color', '#F0FFF0');
                });
            })();
        };

    }

    function handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }

    function triggerFileSelection(node) {
            $("#hiddenFilesSelector").click();
    }

    function compatible() {
        try {
            // Check for FileApi
            if (typeof FileReader == "undefined") return false;

            // Check for Blob and slice api
            if (typeof Blob == "undefined") return false;
            var blob = new Blob();
            if (!blob.slice && !blob.webkitSlice) return false;

            // Check for Drag-and-drop
            if (!('draggable' in document.createElement('span'))) return false;
        } catch (e) {
            return false;
        }
        return true;
    }

    (function () {
        var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
        po.src = 'https://apis.google.com/js/plusone.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
    })();

    if (!compatible()) {
        $("#nojavascript").hide();

        // Fade in incompatibility note
        $("#overlay")
            .css('opacity', 0)
            .animate({ opacity: 0.8 }, 2000)

        $("#overlaytextbox")
            .css('opacity', 0)
            .animate({ opacity: 1.0 }, 2000)

        $("#missingfeatures").html(
        "HTML5HASH does not work with this browser. Consider using one of these: \
            <div id=\"browserads\"> \
            <div class=\"browserad\"> \
                    <a href=\"http://affiliates.mozilla.org/link/banner/21269\"> \
                        <img src=\"http://affiliates.mozilla.org/media/uploads/banners/f5eeeddc214ed8ef15e48bc80e1f53b0da4f0574.png\" alt=\"Download: Fast, Fun, Awesome\" /> \
                    </a> \
            </div> \
            <div class=\"browserad\"> \
                    <a href=\"http://www.google.com/chrome/\"> \
                        <img src=\"img/chrome_logo.png\" alt=\"Google Chrome\" /> \
                    </a> \
            </div> \
        </div>");

        return; // Nevermind initialising the handlers
    }

    // Hide incompatibility warning
    $("#overlay").hide();
    $("#overlaytextbox").hide();

    // Setup the dnd listeners.
    var dropZone = document.getElementById('drop_zone');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);

    // Setup browse listener
    var fileSelector = document.getElementById('hiddenFilesSelector');
    fileSelector.addEventListener('change', handleFileSelect, false);

    $("#placeholder").click(triggerFileSelection);

});