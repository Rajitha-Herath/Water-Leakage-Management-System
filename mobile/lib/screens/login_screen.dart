import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController(text: 'officer1@nwsdb.lk');
  final password = TextEditingController(text: 'Officer@123');
  final formKey = GlobalKey<FormState>();
  bool hidden = true;

  @override
  void dispose() { email.dispose(); password.dispose(); super.dispose(); }

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    await context.read<AuthProvider>().login(email.text.trim(), password.text);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(25),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Form(
                key: formKey,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Container(width: 68, height: 68, decoration: BoxDecoration(color: const Color(0xffdaf4e9), borderRadius: BorderRadius.circular(20)), child: const Icon(Icons.water_drop_rounded, size: 36, color: Color(0xff0b5d4b))),
                  const SizedBox(height: 28),
                  const Text('NWSDB FIELD OPERATIONS', style: TextStyle(color: Color(0xff147d65), letterSpacing: 1.5, fontSize: 11, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 7),
                  const Text('Welcome, field officer', style: TextStyle(fontSize: 29, fontWeight: FontWeight.w900, letterSpacing: -.6)),
                  const SizedBox(height: 7),
                  const Text('Sign in to receive assignments and update repair progress.', style: TextStyle(color: Color(0xff6f7d78), height: 1.45)),
                  if (auth.error != null) ...[const SizedBox(height: 18), Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xffffe8e5), borderRadius: BorderRadius.circular(10)), child: Text(auth.error!, style: const TextStyle(color: Color(0xffa62b22), fontWeight: FontWeight.w600)))],
                  const SizedBox(height: 25),
                  TextFormField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.email_outlined)), validator: (value) => value != null && value.contains('@') ? null : 'Enter a valid email address'),
                  const SizedBox(height: 14),
                  TextFormField(controller: password, obscureText: hidden, decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(onPressed: () => setState(() => hidden = !hidden), icon: Icon(hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined))), validator: (value) => (value?.length ?? 0) >= 8 ? null : 'Password must have at least 8 characters', onFieldSubmitted: (_) => submit()),
                  const SizedBox(height: 22),
                  ElevatedButton(onPressed: auth.loading ? null : submit, child: auth.loading ? const SizedBox(width: 23, height: 23, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Sign in')),
                  const SizedBox(height: 20),
                  const Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.verified_user_outlined, size: 15, color: Color(0xff84918c)), SizedBox(width: 5), Text('Authorized NWSDB staff only', style: TextStyle(color: Color(0xff84918c), fontSize: 12))]),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

