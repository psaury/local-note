var $ = DomRender();
var $IsSaved = $.createState(true);
var DB = null;
var CurrentDocument = null;

addEventListener('beforeunload', (ev) => {
  if (!$IsSaved.get()) {
    ev.preventDefault();
    ev.returnValue = 'Not yet saved.';
  }
});

addEventListener('load', () => {
  var params = RequireSearchParams();
  if (params.mode === 'modeEditDocument') {
    if (params.documentId) {
      CurrentDocument = RequireDB().documents[params.documentId];
    }
    if (!CurrentDocument) {
      CurrentDocument = CreateNewDocument();
    }
    var usp = new URLSearchParams(location.search);
    usp.set('documentId', CurrentDocument.documentId);
    history.replaceState(null, '', '?' + usp.toString());
  }
  TopDom();
  $.mountTo(document.body);
});

function RequireSearchParams() {
  var usp = new URLSearchParams(location.search);
  var params = {};
  params.mode = usp.get('mode') || 'modeEditDocument';
  params.documentId = usp.get('documentId') || null;
  return params;
}

function CreateNewDocument() {
  var date = new Date();
  return {
    documentId: GenerateDocumentId(date),
    createDate: date.toISOString(),
    updateDate: date.toISOString(),
    text: '',
  };
}

function GenerateDocumentId(date) {
  return 'D' + date.toISOString().replaceAll(/[-:.TZ]/g, '');
}

function TopDom() {
  $('div', () => {
    $('.header', () => {
      $('a', () => {
        $.attr('href', CreateUrlString({}));
        $.t('New');
      });
      $('a', () => {
        if (RequireSearchParams().mode !== 'modeListDocuments') {
          $.attr('href', CreateUrlString({ mode: 'modeListDocuments'}));
        }
        $.t('List');
      });
    });
    if (RequireSearchParams().mode === 'modeListDocuments') {
      DocumentListDom();
    } else {
      DocumentEditDom();
    }
  });
}

function DocumentEditDom() {
  $('textarea.textarea', () => {
    $.attr('autofocus');
    $.style('width: calc(100vw - 2rch)');
    $.style('height: calc(100vh - 3rem)');
    $.t(CurrentDocument.text);
    $.event('input', (ev) => {
      $IsSaved.set(false);
      CurrentDocument.text = ev.target.value;
      RequireDB().documents[CurrentDocument.documentId] = CurrentDocument;
      ModeratedSaveDB();
    });
  });
}

function DocumentListDom() {
  $('div', () => {
    $('a')
  });
  $('.data-table', () => {
    $('.tr', () => {
      $('.th', () => {
        $.t('documentId');
      });
      $('.th', () => {
        $.t('createDate');
      });
      $('.th', () => {
        $.t('updateDate');
      });
      $('.th', () => {
        $.t('text');
      });
    });
    Sorted(Object.values(RequireDB().documents), doc => doc.createDate, -1).forEach(document => {
      $('.tr', () => {
        $('.td', () => {
          $('a', () => {
            $.attr('href', CreateUrlString({ mode: 'modeEditDocument', documentId: document.documentId }));
            $.t(document.documentId);
          });
        });
        $('.td', () => {
          $.t(FormatDateToShow(new Date(document.createDate)));
        });
        $('.td', () => {
          $.t(FormatDateToShow(new Date(document.updateDate)));
        });
        $('.td', () => {
          $.t(document.text.split('\n')[0]);
        });
      });
    });
  });
}

function Sorted(array, valueFn, order = 1) {
  var copy = [...array];
  copy.sort((x, y) => {
    var v = valueFn ? valueFn(x) : x;
    var w = valueFn ? valueFn(y) : y;
    return order * (v < w ? -1 : v > w ? 1 : 0);
  });
  return copy;
}

function CreateUrlString(params) {
  var usp = new URLSearchParams(params);
  return '?' + usp.toString();
}

function FormatDateToShow(date) {
  const YYYY = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const DD = date.getDate().toString().padStart(2, "0");
  const HH = date.getHours().toString().padStart(2, "0");
  const MM = date.getMinutes().toString().padStart(2, "0");
  const SS = date.getSeconds().toString().padStart(2, "0");
  return `${YYYY}-${mm}-${DD} ${HH}:${MM}:${SS}`;
}

function RequireDB() {
  if (!DB) {
    var json = localStorage.getItem('db');
    DB = json ? JSON.parse(json) : {
      documents: {},
    };
  }
  return DB;
}

function SaveDB() {
  localStorage.setItem('db', JSON.stringify(DB));
  $IsSaved.set(true);
}

var ModeratedSaveDB = Debounce(1, function () {
  SaveDB();
});

function DeleteDocument(documentId) {
  delete DB.documents[documentId];
  $IsSaved.set(false);
  ModeratedSaveDB();
}
