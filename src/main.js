// Defining some global constants
const animateClass = 'glyphicon-refresh-animate';
const loadingHtml = '<span class="glyphicon glyphicon-refresh glyphicon-refresh-animate"></span> Loading';
const appTitle = 'NEAR Guest Book';

// Defining global variables that we initialize asynchronously later.
let refreshTimeout;

String.prototype.format = String.prototype.f = function() {
    var s = this,
        i = arguments.length;

    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};

// check if a string is a valid URL
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;  
  }
}

// Function that initializes the signIn button using WalletAccount
function signedOutFlow() {
  $('#login-button').click(() => {
    walletAccount.requestSignIn(
      // The contract name that would be authorized to be called by the user's account.
      window.nearConfig.contractName,
      appTitle
      // We can also provide URLs to redirect on success and failure.
      // The current URL is used by default.
    );
  });
}

// Renders given array of messages
function renderMessages(messages) {
  let objs = [];
  for (let i = 0; i < messages.length; ++i) {
    console.log(messages[i]);
    shortUrl = '/s?id='+messages[i].uid;
    shortUrl2 = 'app.near.ai/app/pye3o6pgr/s?id='+messages[i].uid;
    var row = "\
        <tr>\
          <td><p class='smaller'>{0}</p></td>\
          <td style='min-width:133px'><a class='small' target='_blank' href='{1}'><strong>{2}</strong></a></td>\
          <td><a target='_blank' href='https://explorer.nearprotocol.com/block/{3}'><code>{3}</code></a></td>\
          <td><a target='_blank' href='https://explorer.nearprotocol.com/tx/{4}'>link</a></td>\
        </tr>".f(messages[i].longURL, shortUrl, shortUrl2, 'getblockheight', 'gettransactionhash' );
        //console.log(row);
        $("#tx-table").prepend(row);

    objs.push(
      $('<div/>').addClass('row').append([
        $('<div/>').addClass('col-sm-3').append(
          $('<strong/>').text(messages[i].sender)
        ),
        $('<div/>').addClass('col-sm-9').addClass('message-text').text(messages[i].longURL),
      ])
    );
  }
  $('#messages').empty().append(objs.reverse());
  $('#refresh-span').removeClass(animateClass);
}

// Calls view function on the contract and sets up timeout to be called again in 5 seconds
// It only calls the contract if the this page/tab is active.
function refreshMessages() {
  // If we already have a timeout scheduled, cancel it
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  // Schedules a new timeout
  refreshTimeout = setTimeout(refreshMessages, 5000);
  // Checking if the page is not active and exits without requesting messages from the chain
  // to avoid unnecessary queries to the devnet.
  if (document.hidden) {
    return;
  }
  // Adding animation UI
  $('#refresh-span').addClass(animateClass);
  // Calling the contract to read messages which makes a call to devnet.
  // The read call works even if the Account ID is not provided.
  contract.getUrls({})
    .then(renderMessages)
    .catch(console.log);
}


function submitMessage() {

  let text = $('#text-message').val();
    if(!text){
      return window.alert("URL VALUE IS EMPTY");
    }
    if(!isValidUrl(text)){
      return window.alert("INVALID URL");
    }

  
  $('#text-message').val('');
  // Calls the addMessage on the contract with arguments {text=text}.
  contract.shortenURL({longURL: text})
    .then(() => {
      // Starting refresh animation
      $('#refresh-span').addClass(animateClass);
      // Refreshing the messages in 1 seconds to account for the block creation
      setTimeout(() => {
        refreshMessages();
      }, 1000);
    })
    .catch(console.error);
}

// Main function for the signed-in flow (already authorized by the wallet).
function signedInFlow() {
  // Hiding sign-in html parts and showing post message things
  $('#sign-in-container').addClass('hidden');
  $('#guest-book-container').removeClass('hidden');
  $('#logout-option').removeClass('hidden');

  // Displaying the accountId
  $('.account-id').text(window.accountId);

  // Focusing on the enter message field.
  $('#text-message').focus();

  // Adding handling for logging out
  $('#logout-button').click(() => {
    // It removes the auth token from the local storage.
    walletAccount.signOut();
    // Forcing redirect.
    window.location.replace(window.location.origin + window.location.pathname);
  });

  // Enablid enter key to send messages as well.
  $('#text-message').keypress(function (e) {
    if (e.which == 13) {
      e.preventDefault();
      submitMessage();
      return false;
    }
  });
  // Post button to send messages
  $('#submit-tx-button').click(submitMessage);
}

// Initialization code
async function init() {
  console.log('nearConfig', nearConfig);

  // Initializing connection to the NEAR DevNet.
  window.near = await nearlib.connect(Object.assign({ deps: { keyStore: new nearlib.keyStores.BrowserLocalStorageKeyStore() } }, nearConfig));

  // Initializing Wallet based Account. It can work with NEAR DevNet wallet that
  // is hosted at https://wallet.nearprotocol.com
  window.walletAccount = new nearlib.WalletAccount(window.near);

  // Getting the Account ID. If unauthorized yet, it's just empty string.
  window.accountId = walletAccount.getAccountId();

  // Initializing the contract.
  // For now we need to specify method names from the contract manually.
  // It also takes the Account ID which it would use for signing transactions.
  contract = await near.loadContract(nearConfig.contractName, {
    viewMethods: ['getMessages','getUrls'],
    changeMethods: ['addMessage', 'shortenURL'],
    sender: window.accountId,
  });

  // Enable wallet link now that config is available
  $('a.wallet').removeClass('disabled').attr('href', nearConfig.walletUrl);

  // Initializing messages and starting auto-refreshing.
  $('#messages').html(loadingHtml);
  $('#refresh-button').click(refreshMessages);
  refreshMessages();

  // Based on whether you've authorized, checking which flow we should go.
  if (!walletAccount.isSignedIn()) {
    signedOutFlow();
  } else {
    signedInFlow();
  }
}

init().catch(console.error);