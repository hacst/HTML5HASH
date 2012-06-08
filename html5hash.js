$().ready(function () {
    function decimalToHexString(number) {
        if (number < 0) {
            number = 0xFFFFFFFF + number + 1;
        }

        return number.toString(16);
    }

    function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        var files = evt.dataTransfer.files; // FileList object.

        // files is a FileList of File objects. List some properties.
        var f = files[0];
        for (var i = 0, f; f = files[i]; i++) {
            var reader = new FileReader();
            reader.onload = (function(file) {
                return function (e) {
                    var sha1 = CryptoJS.SHA1(e.target.result);
                    var md5 = CryptoJS.MD5(e.target.result);
                    var crc = decimalToHexString(crc32(e.target.result));
                    document.getElementById('list').innerHTML
                        += '<li><b>' + escape(file.name) + ':</b><br />'
                        + 'SHA1: ' + sha1 + '<br />'
                        + 'MD5: ' + md5 + '<br />'
                        + 'CRC-32: ' + crc + '</li>';
                };
            })(f);

            reader.readAsBinaryString(f);
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